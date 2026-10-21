/* שאלון הצטרפות – ניווט בין שלבים, בדיקות ושליחה */
(function () {
  "use strict";
  var CFG = window.TAUTZA_CONFIG || {};
  var form = document.getElementById("join-form");
  if (!form) return;
  var steps = Array.prototype.slice.call(form.querySelectorAll(".join-step"));
  var bar = document.getElementById("join-bar");
  var count = document.getElementById("join-count");
  var back = document.getElementById("join-back");
  var next = document.getElementById("join-next");
  var errBox = document.getElementById("join-error");
  var i = 0;

  function show(n) {
    steps.forEach(function (s, k) { s.hidden = k !== n; });
    i = n;
    bar.style.width = Math.round((n / steps.length) * 100 + 100 / steps.length / 2) + "%";
    count.textContent = "שלב " + (n + 1) + " מתוך " + steps.length;
    back.hidden = n === 0;
    next.textContent = n === steps.length - 1 ? "שליחה ותיאום שיחה" : "המשך";
    var first = steps[n].querySelector("input:not([tabindex='-1']),textarea");
    if (n > 0 && first) setTimeout(function () { first.focus({ preventScroll: true }); }, 50);
    var top = form.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
  }

  function fieldOk(el, ok) {
    var wrap = el.closest(".jf");
    if (wrap) wrap.classList.toggle("has-error", !ok);
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    return ok;
  }

  function validate(step) {
    var ok = true, firstBad = null;
    Array.prototype.forEach.call(step.querySelectorAll("input[required]:not([type=checkbox]),textarea[required]"), function (el) {
      var v = el.value.trim(), good = v.length > 1;
      if (el.name === "phone") good = /^(\+?972|0)\d{8,9}$/.test(v.replace(/[^\d+]/g, ""));
      if (el.type === "email") good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!fieldOk(el, good)) { ok = false; firstBad = firstBad || el; }
    });
    Array.prototype.forEach.call(step.querySelectorAll("input[type=checkbox][required]"), function (el) {
      if (!fieldOk(el, el.checked)) { ok = false; firstBad = firstBad || el; }
    });
    Array.prototype.forEach.call(step.querySelectorAll(".choices[data-required]"), function (g) {
      var picked = g.querySelector("input:checked");
      var err = g.parentNode.querySelector(".choices-err");
      if (err) err.classList.toggle("show", !picked);
      if (!picked) { ok = false; firstBad = firstBad || g.querySelector("input"); }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  form.addEventListener("change", function (e) {
    var g = e.target.closest(".choices");
    if (g) { var err = g.parentNode.querySelector(".choices-err"); if (err) err.classList.remove("show"); }
  });

  back.addEventListener("click", function () { if (i > 0) show(i - 1); });

  function collect() {
    var data = {};
    ["name", "phone", "email", "field", "challenge_more", "goal"].forEach(function (k) { data[k] = (form.elements[k].value || "").trim(); });
    ["business", "stage", "time"].forEach(function (k) {
      var c = form.querySelector('input[name="' + k + '"]:checked'); data[k] = c ? c.value : "";
    });
    ["challenges", "channels", "call_time"].forEach(function (k) {
      data[k] = Array.prototype.map.call(form.querySelectorAll('input[name="' + k + '"]:checked'), function (x) { return x.value; }).join(", ");
    });
    data.marketing = form.elements.marketing.checked ? "כן" : "לא";
    return data;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.elements.website.value) return;
    if (!validate(steps[i])) return;
    if (i < steps.length - 1) { show(i + 1); return; }

    var d = collect();
    var nd = function (v) { return v || "לא צוין"; };
    var jobs = [];
    if (CFG.LEAD_EMAIL) {
      jobs.push(fetch("https://formsubmit.co/ajax/" + CFG.LEAD_EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: "שאלון הצטרפות לקהילה: " + d.name,
          _template: "table", _captcha: "false",
          "שם": d.name, "טלפון": d.phone, "אימייל": d.email,
          "מה מלמד/ת": nd(d.business), "תחום": nd(d.field),
          "שלב העסק": nd(d.stage), "מה תוקע": nd(d.challenges), "פירוט": nd(d.challenge_more),
          "איפה הקהל": nd(d.channels), "מטרה ל-3 חודשים": nd(d.goal), "זמן בשבוע": nd(d.time),
          "זמנים לשיחה": nd(d.call_time), "הסכמה לדיוור": d.marketing,
          "UTM": nd(location.search), "זמן": new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })
        })
      }).then(function (r) { if (!r.ok) throw new Error("mail " + r.status); }));
    }
    if (CFG.LEAD_ENDPOINT) {
      var lead = {};
      Object.keys(d).forEach(function (k) { lead[k] = d[k]; });
      lead.marketing_consent = d.marketing; lead.track = "questionnaire"; lead.button = "שאלון";
      lead.interest = "שאלון הצטרפות לקהילה"; lead.page = location.pathname; lead.utm = location.search;
      lead.submitted_at = new Date().toISOString();
      jobs.push(fetch(CFG.LEAD_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) })
        .then(function (r) { if (!r.ok) throw new Error("lead " + r.status); }));
    }

    next.disabled = true; errBox.hidden = true;
    /* מספיק שאחד היעדים קיבל את התשובות */
    var sent = new Promise(function (resolve, reject) {
      var left = jobs.length; if (!left) return resolve();
      jobs.forEach(function (j) { j.then(resolve, function () { if (--left === 0) reject(); }); });
    });
    sent.then(function () {
      try { if (window.fbq) window.fbq("track", "CompleteRegistration", { content_name: "community_questionnaire" }); } catch (x) {}
      try { localStorage.setItem("tz_lead_done", "1"); } catch (x) {}
      done(d);
    }).catch(function () { errBox.hidden = false; }).then(function () { next.disabled = false; });
  });

  function done(d) {
    form.hidden = true;
    document.querySelector(".join-progress").hidden = true;
    count.hidden = true;
    document.getElementById("done-name").textContent = d.name.split(" ")[0];
    var actions = document.getElementById("done-actions");
    if (CFG.CALENDAR_URL) actions.insertAdjacentHTML("beforeend", '<a class="a-dark" href="' + (window.TZ_calLink ? window.TZ_calLink(d) : CFG.CALENDAR_URL).replace(/"/g, "&quot;") + '" target="_blank" rel="noopener">לקבוע את השיחה ביומן עכשיו</a>');
    if (CFG.COMMUNITY_PAYMENT_URL) actions.insertAdjacentHTML("beforeend", '<a class="a-primary" href="' + CFG.COMMUNITY_PAYMENT_URL + '">להצטרפות עכשיו · ₪50 לחודש</a>');
    if (CFG.WHATSAPP) actions.insertAdjacentHTML("beforeend", '<a class="a-ghost" target="_blank" rel="noopener" href="https://wa.me/' + CFG.WHATSAPP + "?text=" + encodeURIComponent("היי יובל, זה " + d.name + ". מילאתי את שאלון ההצטרפות לקהילה.") + '">לכתוב לי בוואטסאפ</a>');
    actions.insertAdjacentHTML("beforeend", '<a class="a-ghost" href="community.html">חזרה לעמוד הקהילה</a>');
    var box = document.getElementById("join-done"); box.hidden = false; box.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  show(0);
})();
