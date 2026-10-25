/*
 * תאוצה – שרת האתר + מחבר לסמוב
 * --------------------------------
 * מגיש את האתר הסטטי (אותן הגדרות כמו serve.json) ומוסיף שלושה נתיבים:
 *   POST /api/lead   ← טפסים מהאתר (פופ-אפים + שאלון)  → איש קשר ברשימה המתאימה בסמוב
 *   POST /api/cal    ← Webhook מ-Cal.com (נקבע/נדחה/בוטל) → מעביר לרשימת "נקבעה שיחה"
 *   GET  /api/health ← בדיקה מה מוגדר (בלי לחשוף סודות)
 *
 * כל ההגדרות במשתני סביבה ב-Railway (Variables):
 *   SMOOVE_API_KEY             מפתח API מסמוב (חובה כדי שהחיבור יעבוד)
 *   SMOOVE_LIST_CALL           מזהה רשימה: לידים · שיחה
 *   SMOOVE_LIST_COMMUNITY      מזהה רשימה: לידים · קהילה (פופ-אפ בלי שאלון)
 *   SMOOVE_LIST_QUESTIONNAIRE  מזהה רשימה: שאלון הושלם
 *   SMOOVE_LIST_BOOKED         מזהה רשימה: נקבעה שיחה
 *   SMOOVE_LIST_CANCELLED      (לא חובה) מזהה רשימה: שיחה בוטלה
 *   SMOOVE_FIELDS              (לא חובה) JSON של שדות מותאמים, למשל {"goal":"i3","business":"i4"}
 *   CAL_WEBHOOK_SECRET         (מומלץ) הסוד שמגדירים ב-Webhook של Cal
 */
"use strict";

const http = require("http");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const handler = require("serve-handler");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const SERVE_CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "serve.json"), "utf8"));
const SMOOVE_URL = "https://rest.smoove.io/v1/Contacts?updateIfExists=true&restoreIfDeleted=true&restoreIfUnsubscribed=true";
const MAX_BODY = 32 * 1024;

const env = (k) => (process.env[k] || "").trim();
const listId = (k) => { const n = parseInt(env(k), 10); return Number.isFinite(n) ? n : null; };
const ids = (...keys) => keys.map(listId).filter((n) => n !== null);

function fieldMap() {
  try { return JSON.parse(env("SMOOVE_FIELDS") || "{}"); } catch (e) { console.error("SMOOVE_FIELDS is not valid JSON"); return {}; }
}

function log(...a) { console.log(new Date().toISOString(), ...a); }

/* ---------- עזר HTTP ---------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(obj));
}

/* הגבלת קצב פשוטה: עד 8 שליחות לדקה מאותה כתובת */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 8;
}
const clientIp = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "";

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

/* ---------- סמוב ---------- */
const clean = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function normalizePhone(p) {
  let d = clean(p, 30).replace(/[^\d+]/g, "");
  if (d.startsWith("+972")) d = "0" + d.slice(4);
  else if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

async function smooveUpsert({ email, phone, name, subscribe = [], unsubscribe = [], fields = {}, consent = true }) {
  const key = env("SMOOVE_API_KEY");
  if (!key) { log("smoove: skipped (no SMOOVE_API_KEY)", email); return { skipped: true }; }

  const parts = clean(name, 120).split(/\s+/).filter(Boolean);
  const map = fieldMap();
  const customFields = {};
  Object.keys(fields).forEach((k) => { if (map[k] && fields[k]) customFields[map[k]] = clean(String(fields[k]), 1000); });

  const body = {
    email: clean(email, 200).toLowerCase(),
    cellPhone: normalizePhone(phone) || undefined,
    firstName: parts[0] || undefined,
    lastName: parts.slice(1).join(" ") || undefined,
    canReceiveEmails: consent,
    canReceiveSmsMessages: consent,
    lists_ToSubscribe: subscribe,
    lists_ToUnsubscribe: unsubscribe,
    customFields: Object.keys(customFields).length ? customFields : undefined
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(SMOOVE_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const text = await r.text();
    if (!r.ok) throw new Error("smoove " + r.status + " " + text.slice(0, 300));
    log("smoove: ok", body.email, "sub", subscribe, "unsub", unsubscribe);
    return { ok: true };
  } finally { clearTimeout(timer); }
}

/* ---------- /api/lead ---------- */
async function handleLead(req, res) {
  if (!sameOrigin(req)) return json(res, 403, { ok: false });
  if (rateLimited(clientIp(req))) return json(res, 429, { ok: false });

  let d;
  try { d = JSON.parse((await readBody(req)).toString("utf8")); } catch (e) { return json(res, e.status || 400, { ok: false }); }
  if (!d || typeof d !== "object") return json(res, 400, { ok: false });
  if (d.website) return json(res, 200, { ok: true }); /* בוט */

  const email = clean(d.email, 200);
  const phone = normalizePhone(d.phone);
  const name = clean(d.name, 120);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^0\d{8,9}$/.test(phone)) return json(res, 400, { ok: false, error: "invalid" });
  if (d.marketing_consent !== "כן") return json(res, 400, { ok: false, error: "consent" });

  const track = ["call", "community", "questionnaire"].includes(d.track) ? d.track : "call";
  const plan = {
    call: { subscribe: ids("SMOOVE_LIST_CALL"), unsubscribe: [] },
    community: { subscribe: ids("SMOOVE_LIST_COMMUNITY"), unsubscribe: [] },
    /* מי שמילא שאלון יוצא/ת מרצף "תמלא/י שאלון" של הקהילה */
    questionnaire: { subscribe: ids("SMOOVE_LIST_QUESTIONNAIRE"), unsubscribe: ids("SMOOVE_LIST_COMMUNITY") }
  }[track];

  const utm = new URLSearchParams(clean(d.utm, 400).replace(/^\?/, ""));
  const fields = {
    business: d.business, field: d.field, stage: d.stage, challenges: d.challenges,
    channels: d.channels, goal: d.goal, time: d.time, call_time: d.call_time,
    source: [track, clean(d.button, 60), clean(d.page, 80)].filter(Boolean).join(" · "),
    utm_source: utm.get("utm_source"), utm_campaign: utm.get("utm_campaign"), utm_medium: utm.get("utm_medium"),
    status: track === "questionnaire" ? "שאלון הושלם" : "ליד חדש"
  };

  try {
    const r = await smooveUpsert({ email, phone, name, subscribe: plan.subscribe, unsubscribe: plan.unsubscribe, fields });
    return json(res, 200, { ok: true, skipped: !!r.skipped });
  } catch (e) {
    log("lead error:", e.message);
    return json(res, 502, { ok: false });
  }
}

/* ---------- /api/cal ---------- */
function validCalSignature(raw, header) {
  const secret = env("CAL_WEBHOOK_SECRET");
  if (!secret) return true;
  if (!header) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(String(header).trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function calDate(iso) {
  const t = new Date(iso);
  if (isNaN(t)) return { date: "", time: "" };
  const opts = { timeZone: "Asia/Jerusalem" };
  return {
    date: t.toLocaleDateString("he-IL", { ...opts, weekday: "long", day: "numeric", month: "numeric" }),
    time: t.toLocaleTimeString("he-IL", { ...opts, hour: "2-digit", minute: "2-digit" })
  };
}

async function handleCal(req, res) {
  let raw;
  try { raw = await readBody(req); } catch (e) { return json(res, e.status || 400, { ok: false }); }
  if (!validCalSignature(raw, req.headers["x-cal-signature-256"])) { log("cal: bad signature"); return json(res, 401, { ok: false }); }

  let evt;
  try { evt = JSON.parse(raw.toString("utf8")); } catch (e) { return json(res, 400, { ok: false }); }
  const type = evt.triggerEvent;
  const p = evt.payload || {};
  if (type === "PING" || !p) return json(res, 200, { ok: true });

  const att = (p.attendees || [])[0] || {};
  const resp = p.responses || {};
  const val = (k) => (resp[k] && typeof resp[k] === "object" ? resp[k].value : resp[k]);
  const email = att.email || val("email");
  if (!email) return json(res, 200, { ok: true, ignored: "no email" });
  const phone = val("attendeePhoneNumber") || val("phone") || "";
  const name = att.name || (typeof val("name") === "string" ? val("name") : "");
  const leadLists = ids("SMOOVE_LIST_CALL", "SMOOVE_LIST_COMMUNITY", "SMOOVE_LIST_QUESTIONNAIRE");

  let sub = [], unsub = [], status = "";
  const when = calDate(p.startTime);
  if (type === "BOOKING_CREATED" || type === "BOOKING_RESCHEDULED") {
    /* נקבעה שיחה: נכנס/ת לרשימת "נקבעה שיחה" ויוצא/ת מכל רצפי הנדנוד */
    sub = ids("SMOOVE_LIST_BOOKED"); unsub = leadLists.concat(ids("SMOOVE_LIST_CANCELLED")); status = "נקבעה שיחה";
    /* בהזזה: יוצאים ונכנסים מחדש כדי שהתזכורות ייבנו לפי המועד החדש */
    if (type === "BOOKING_RESCHEDULED" && sub.length) {
      try { await smooveUpsert({ email, phone, name, unsubscribe: sub }); } catch (e) { log("cal resched pre-step:", e.message); }
    }
  } else if (type === "BOOKING_CANCELLED") {
    sub = ids("SMOOVE_LIST_CANCELLED"); unsub = ids("SMOOVE_LIST_BOOKED"); status = "שיחה בוטלה";
  } else {
    return json(res, 200, { ok: true, ignored: type });
  }

  try {
    await smooveUpsert({
      email, phone, name, subscribe: sub, unsubscribe: unsub,
      fields: { status, call_date: when.date, call_time_booked: when.time, zoom: (p.metadata && p.metadata.videoCallUrl) || "" }
    });
    return json(res, 200, { ok: true });
  } catch (e) {
    log("cal error:", e.message);
    return json(res, 502, { ok: false });
  }
}

/* ---------- שרת ---------- */
const server = http.createServer(async (req, res) => {
  const url = (req.url || "/").split("?")[0];
  try {
    if (url.startsWith("/api/")) {
      if (url === "/api/lead" && req.method === "POST") return await handleLead(req, res);
      if (url === "/api/cal" && req.method === "POST") return await handleCal(req, res);
      if (url === "/api/health" && req.method === "GET") {
        return json(res, 200, {
          ok: true,
          smoove: !!env("SMOOVE_API_KEY"),
          lists: { call: listId("SMOOVE_LIST_CALL"), community: listId("SMOOVE_LIST_COMMUNITY"), questionnaire: listId("SMOOVE_LIST_QUESTIONNAIRE"), booked: listId("SMOOVE_LIST_BOOKED"), cancelled: listId("SMOOVE_LIST_CANCELLED") },
          fields: Object.keys(fieldMap()),
          calSecret: !!env("CAL_WEBHOOK_SECRET")
        });
      }
      return json(res, 404, { ok: false });
    }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
    if (/^\/(server\.js|railway\.json|serve\.json|package(-lock)?\.json|README\.md|\.git|\.env|node_modules|tools)(\/|$)/i.test(decodeURIComponent(url))) {
      res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found");
    }
    return await handler(req, res, Object.assign({ public: ROOT }, SERVE_CONFIG));
  } catch (e) {
    log("server error:", e.message);
    if (!res.headersSent) json(res, 500, { ok: false });
  }
});

server.listen(PORT, "0.0.0.0", () => log("teocha listening on", PORT));
