/* Momentum: automatic emails via Brevo (transactional API).
 * Needs on Railway: BREVO_API_KEY, and a sender verified in Brevo
 * (MOMENTUM_SENDER_EMAIL, default contact@teocha.com; MOMENTUM_SENDER_NAME, default "Yuval from Momentum").
 * Webinar date / Zoom link are read from assets/config.js (MOMENTUM_WEBINAR), so there is one place to edit.
 * BREVO_LIST_WEBINAR = id of a Brevo contact list for webinar registrants (reminders go to it).
 * Without BREVO_API_KEY nothing is sent and nothing breaks. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const env = (k) => (process.env[k] || "").trim();
function log(...a) { console.log(new Date().toISOString(), ...a); }

function siteConfig() {
  try {
    const code = fs.readFileSync(path.join(__dirname, "assets", "config.js"), "utf8");
    const ctx = { window: {} };
    vm.runInNewContext(code, ctx, { timeout: 200 });
    return ctx.window.TAUTZA_CONFIG || {};
  } catch (e) { log("momentum-mail: config read error", e.message); return {}; }
}

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const first = (name) => esc(String(name || "").trim().split(/\s+/)[0] || "there");

function fmt(date, tz, opts) { return new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: tz }, opts)).format(date); }
function whenText(start) {
  const day = fmt(start, "Europe/Paris", { weekday: "long", day: "numeric", month: "long" });
  const fr = fmt(start, "Europe/Paris", { hour: "2-digit", minute: "2-digit" });
  const il = fmt(start, "Asia/Jerusalem", { hour: "2-digit", minute: "2-digit" });
  return { day, fr, il, line: `${day}, ${fr} (Paris) / ${il} (Israel)` };
}
function gcal(start, mins, zoom) {
  const end = new Date(start.getTime() + mins * 60000);
  const f = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
    encodeURIComponent("Free masterclass: Why marketing works for some therapists") +
    "&dates=" + f(start) + "/" + f(end) + "&details=" + encodeURIComponent("Live on Zoom with Yuval Lev." + (zoom ? "\nZoom: " + zoom : ""));
}

function layout(inner) {
  return `<!doctype html><html><body style="margin:0;background:#FAF6F0;font-family:Arial,Helvetica,sans-serif;color:#24201D">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 20px;font-weight:bold;font-size:18px">Momentum <span style="color:#C4502F">Studio</span></p>
<div style="background:#ffffff;border-radius:18px;padding:28px 26px;font-size:16px;line-height:1.6">${inner}</div>
<p style="font-size:13px;color:#5C544C;margin:18px 4px 0">Momentum Studio, by Teocha Group · Yuval Lev · contact@teocha.com<br>You are receiving this because you registered on teocha.com.</p>
</div></body></html>`;
}
const button = (href, text) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#C4502F;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px">${esc(text)}</a></p>`;

async function brevoSend({ to, name, subject, html, scheduledAt }) {
  const key = env("BREVO_API_KEY");
  if (!key) return { skipped: true };
  const body = {
    sender: { email: env("MOMENTUM_SENDER_EMAIL") || "contact@teocha.com", name: env("MOMENTUM_SENDER_NAME") || "Yuval from Momentum" },
    replyTo: { email: env("MOMENTUM_SENDER_EMAIL") || "contact@teocha.com" },
    to: [{ email: to, name: name || undefined }],
    subject, htmlContent: html
  };
  if (scheduledAt) body.scheduledAt = scheduledAt.toISOString();
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST", headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("brevo " + r.status + " " + (await r.text()).slice(0, 200));
  return { ok: true };
}

async function brevoApi(method, url, body) {
  const r = await fetch("https://api.brevo.com/v3" + url, {
    method, headers: { "api-key": env("BREVO_API_KEY"), "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const t = await r.text();
  if (!r.ok) throw new Error("brevo " + method + " " + url + " " + r.status + " " + t.slice(0, 200));
  return t ? JSON.parse(t) : {};
}

function webinarInfo() {
  const W = siteConfig().MOMENTUM_WEBINAR || {};
  const start = W.DATE ? new Date(W.DATE) : null;
  const ok = start && !isNaN(start);
  return { start: ok ? start : null, mins: Number(W.MINUTES) || 60, zoom: W.ZOOM_URL || "", w: ok ? whenText(start) : null };
}
function zoomBlockFor(zoom) {
  return zoom
    ? `${button(zoom, "Join on Zoom")}<p style="font-size:14px;color:#5C544C;margin-top:-8px">Zoom link: <a href="${esc(zoom)}">${esc(zoom)}</a></p>`
    : `<p>Your Zoom link will arrive in a reminder email before we start.</p>`;
}

/* Webinar registration: add to the Brevo list (for the reminders) + confirmation email now. */
async function sendWebinarEmails({ email, name }) {
  if (!env("BREVO_API_KEY")) return;
  const list = Number(env("BREVO_LIST_WEBINAR"));
  if (list) {
    try {
      await brevoApi("POST", "/contacts", { email, updateEnabled: true, listIds: [list], attributes: { FIRSTNAME: String(name || "").trim().split(/\s+/)[0] || "" } });
    } catch (e) { log("momentum-mail: add contact failed", email, e.message); }
  }
  const { start, mins, zoom, w } = webinarInfo();
  const html = layout(`<p>Hi ${first(name)},</p>
<p><b>You're in!</b> Your free seat for the masterclass <b>"Why marketing works for some therapists, and not for others"</b> is saved.</p>
${w ? `<p style="background:#FAF6F0;border-radius:12px;padding:14px 16px"><b>${esc(w.day)}</b><br>${esc(w.fr)} Paris time · ${esc(w.il)} Israel time · ${mins} minutes, live on Zoom</p>` : ""}
${zoomBlockFor(zoom)}
${start ? `<p><a href="${esc(gcal(start, mins, zoom))}">Add it to your Google Calendar</a></p>` : ""}
<p>One small thing before we meet: think about the one client you'd love to see more of in your practice. We'll start right there.</p>
<p>See you soon,<br>Yuval</p>`);
  await brevoSend({ to: email, name, subject: "You're in: free masterclass for therapists", html });
}

/* Reminders 24h and 1h before, as Brevo campaigns to the webinar list.
 * Runs every 30 minutes; each campaign is created once, about 4 hours before it goes out,
 * so it picks up the latest Zoom link and everyone who registered by then. */
async function ensureWebinarReminders() {
  const list = Number(env("BREVO_LIST_WEBINAR"));
  if (!env("BREVO_API_KEY") || !list) return;
  const { start, zoom, w } = webinarInfo();
  if (!start) return;
  const now = Date.now();
  const items = [
    { tag: "24h", at: new Date(start.getTime() - 24 * 3600e3), subject: "Tomorrow: your free masterclass", lead: `Just a friendly reminder: we meet <b>tomorrow, ${esc(w.fr)} Paris time</b> (${esc(w.il)} Israel time).` },
    { tag: "1h", at: new Date(start.getTime() - 60 * 60e3), subject: "We start in 1 hour", lead: `We start <b>in one hour</b>, at ${esc(w.fr)} Paris time (${esc(w.il)} Israel time). Grab a tea and a notebook.` }
  ];
  const due = items.filter((r) => r.at.getTime() - now > 10 * 60e3 && r.at.getTime() - now < 4 * 3600e3);
  if (!due.length) return;
  const existing = await brevoApi("GET", "/emailCampaigns?limit=50&sort=desc");
  const names = new Set((existing.campaigns || []).map((c) => c.name));
  for (const r of due) {
    const cname = `Momentum webinar ${start.toISOString().slice(0, 16)} reminder ${r.tag}`;
    if (names.has(cname)) continue;
    const html = layout(`<p>Hi {{ contact.FIRSTNAME | default : "there" }},</p><p>${r.lead}</p>${zoomBlockFor(zoom)}<p>See you there,<br>Yuval</p>
<p style="font-size:12px;color:#5C544C"><a href="{{ unsubscribe }}" style="color:#5C544C">Unsubscribe</a></p>`);
    try {
      await brevoApi("POST", "/emailCampaigns", {
        name: cname, subject: r.subject, type: "classic", htmlContent: html,
        sender: { email: env("MOMENTUM_SENDER_EMAIL") || "contact@teocha.com", name: env("MOMENTUM_SENDER_NAME") || "Yuval from Momentum" },
        recipients: { listIds: [list] }, scheduledAt: r.at.toISOString()
      });
      log("momentum-mail: reminder scheduled", cname);
    } catch (e) { log("momentum-mail: reminder campaign failed", cname, e.message); }
  }
}
function startReminderLoop() {
  const run = () => ensureWebinarReminders().catch((e) => log("momentum-mail: reminders", e.message));
  setTimeout(run, 15e3);
  setInterval(run, 30 * 60e3).unref();
}

/* Course: welcome email right after payment. */
async function sendCourseWelcome({ email, name, plan }) {
  if (!env("BREVO_API_KEY")) return;
  const html = layout(`<p>Hi ${first(name)},</p>
<p><b>Bienvenue!</b> Your place in <b>Momentum: Marketing for Therapists</b> is confirmed${plan === "full" ? " (paid in full)" : " (€79/month for 3 months)"}. I'm genuinely happy you're here.</p>
<p>Your payment receipt arrives in a separate email.</p>
<p><b>What happens next</b><br>We open once 10 therapists have joined. You'll receive the start date, the weekly time (Central European Time) and your Zoom link by email before we begin.</p>
<p><b>One thing to prepare</b><br>Think about the one client you'd love to see more of in your practice. Who is she? What is she struggling with? That's exactly where we start.</p>
<p>Remember: you have 14 days for a full refund, no questions asked. Simply reply to this email.</p>
<p>See you very soon,<br>Yuval Lev</p>`);
  await brevoSend({ to: email, name, subject: "Bienvenue to Momentum, your place is confirmed", html });
}

module.exports = { sendWebinarEmails, sendCourseWelcome, startReminderLoop, ensureWebinarReminders };
