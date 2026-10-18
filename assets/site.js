/* תאוצה סטודיו – פופ-אפ השארת פרטים, פיקסל ונגישות בסיסית */
(function () {
  "use strict";
  var CFG = window.TAUTZA_CONFIG || {};

  /* ---------- Meta Pixel (נטען רק אם הוגדר מזהה) ---------- */
  if (CFG.META_PIXEL_ID) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', String(CFG.META_PIXEL_ID));
    window.fbq('track', 'PageView');
  }
  function track(event, data) { try { if (window.fbq) window.fbq('track', event, data || {}); } catch (e) {} }

  /* ---------- תוכן הפופ-אפ לפי סוג הכפתור ---------- */
  var VARIANTS = {
    call: {
      eyebrow: "שיחת היכרות",
      title: "בוא נדבר על הצעד הבא.",
      sub: "משאירים פרטים – וחוזרים אליך תוך יום עסקים לשיחה קצרה. בלי התחייבות.",
      submit: "תחזרו אליי",
      doneTitle: "קיבלנו! נדבר בקרוב.",
      doneText: "נחזור אליך תוך יום עסקים כדי לתאם שיחת היכרות."
    },
    community: {
      theme: "community",
      eyebrow: "קהילת מאיצים ונהנים",
      title: "לא צריך לעשות את זה לבד.",
      sub: "משאירים פרטים – ונשלח לך את כל מה שצריך כדי להצטרף.",
      perks: ["גישה לכל השיעורים", "מאסטרמיינד קבוצתי בזום, פעם בשבוע", "קהילה של אנשים שבונים עסק כמוך"],
      price: "₪50 לחודש · ביטול בכל עת",
      submit: "אני שייך לקהילה הזו",
      doneTitle: "מעולה, אתה כמעט בפנים!",
      doneText: "ניצור איתך קשר בהקדם עם פרטי ההצטרפות."
    },
    exit: {
      theme: "exit",
      eyebrow: "רגע לפני שאתה הולך",
      title: "15 דקות שיכולות למלא לך את הכיתה.",
      sub: "שיחת היכרות קצרה, בלי עלות ובלי התחייבות: נבין איפה העסק שלך עומד, ותצא עם כיוון ברור לצעד הבא.",
      submit: "אני רוצה את השיחה",
      doneTitle: "סגרנו! נדבר בקרוב.",
      doneText: "נחזור אליך תוך יום עסקים לתאם את השיחה."
    },
    exitCommunity: {
      theme: "community",
      eyebrow: "רגע לפני שאתה הולך",
      title: "בוא תצמח איתנו.",
      sub: "קהילת מאיצים ונהנים – שיעורים, מפגש שבועי ואנשים שהולכים באותו כיוון. משאירים פרטים ונשלח לך את כל הפרטים.",
      perks: ["גישה לכל השיעורים", "מאסטרמיינד קבוצתי בזום, פעם בשבוע", "קהילה של אנשים שבונים עסק כמוך"],
      price: "₪50 לחודש · ביטול בכל עת",
      submit: "שלחו לי פרטים",
      doneTitle: "מעולה! הפרטים בדרך.",
      doneText: "ניצור איתך קשר בהקדם."
    },
    contact: {
      eyebrow: "צור קשר",
      title: "נשמח לשמוע ממך.",
      sub: "משאירים פרטים ונחזור אליך בהקדם.",
      submit: "שליחה",
      doneTitle: "תודה! קיבלנו.",
      doneText: "נחזור אליך בהקדם."
    }
  };

  var ICON_CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  var ICON_CHECK = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#24201D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';

  var html =
    '<div class="lead-overlay" id="lead-overlay" hidden>' +
      '<div class="lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-title" aria-describedby="lead-sub">' +
        '<button type="button" class="lead-close" aria-label="סגירה">' + ICON_CLOSE + '</button>' +
        '<div class="lead-form-wrap">' +
          '<p class="lead-eyebrow" id="lead-eyebrow"></p>' +
          '<h2 class="lead-title" id="lead-title"></h2>' +
          '<p class="lead-sub" id="lead-sub"></p>' +
          '<ul class="lead-perks" id="lead-perks"></ul>' +
          '<p class="lead-price" id="lead-price"></p>' +
          '<form class="lead-form" novalidate>' +
            '<div class="lead-field"><label for="lead-name">שם מלא</label>' +
              '<input id="lead-name" name="name" type="text" autocomplete="name" required>' +
              '<span class="lead-err">איך קוראים לך?</span></div>' +
            '<div class="lead-field"><label for="lead-phone">טלפון</label>' +
              '<input id="lead-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right" required>' +
              '<span class="lead-err">צריך מספר טלפון תקין</span></div>' +
            '<div class="lead-field"><label for="lead-email">אימייל <span style="font-weight:400;color:#5C544C">(לא חובה)</span></label>' +
              '<input id="lead-email" name="email" type="email" autocomplete="email" dir="ltr" style="text-align:right">' +
              '<span class="lead-err">כתובת האימייל לא נראית תקינה</span></div>' +
            '<div class="lead-field"><label for="lead-type">מה אתה מלמד?</label>' +
              '<select id="lead-type" name="business">' +
                '<option value="">בחירה…</option>' +
                '<option>אקדמיה</option><option>קורס דיגיטלי</option><option>תוכנית העשרה</option>' +
                '<option>מדריך/ה או מאמן/ת</option><option>עוד לא התחלתי – רוצה לפתח קורס</option><option>אחר</option>' +
              '</select></div>' +
            '<div class="lead-hp" aria-hidden="true"><label for="lead-website">אתר</label><input id="lead-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>' +
            '<label class="lead-consent"><input type="checkbox" name="marketing" value="yes">' +
              '<span>אשמח לקבל מתאוצה תוכן, טיפים ועדכונים במייל ובוואטסאפ. אפשר להסיר בכל רגע.</span></label>' +
            '<p class="lead-form-error" role="alert">משהו השתבש בשליחה. נסה שוב בעוד רגע.</p>' +
            '<button type="submit" class="lead-submit"></button>' +
            '<p class="lead-note">השליחה כפופה ל<a href="privacy.html">מדיניות הפרטיות</a>.</p>' +
          '</form>' +
        '</div>' +
        '<div class="lead-success" role="status" aria-live="polite">' +
          '<div class="lead-check">' + ICON_CHECK + '</div>' +
          '<h2 class="lead-title" id="lead-done-title"></h2>' +
          '<p class="lead-sub" id="lead-done-text" style="margin:0"></p>' +
          '<div class="lead-actions"></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }

  ready(function () {
    /* קישור דילוג לתוכן */
    var main = document.querySelector("main") || document.querySelector(".page");
    if (main) {
      if (!main.id) main.id = "main";
      var skip = document.createElement("a");
      skip.className = "skip-link"; skip.href = "#" + main.id; skip.textContent = "דילוג לתוכן";
      document.body.insertBefore(skip, document.body.firstChild);
    }

    document.body.insertAdjacentHTML("beforeend", html);
    var overlay = document.getElementById("lead-overlay");
    var modal = overlay.querySelector(".lead-modal");
    var form = overlay.querySelector("form");
    var submitBtn = form.querySelector(".lead-submit");
    var formError = form.querySelector(".lead-form-error");
    var lastFocus = null, current = "call", source = "";

    function setText(id, t) { document.getElementById(id).textContent = t; }

    function open(kind, src) {
      if (overlay.classList.contains("is-open")) return;
      current = VARIANTS[kind] ? kind : "call";
      source = src || "";
      var v = VARIANTS[current];
      setText("lead-eyebrow", v.eyebrow); setText("lead-title", v.title); setText("lead-sub", v.sub);
      var perks = document.getElementById("lead-perks"); perks.innerHTML = "";
      (v.perks || []).forEach(function (p) { var li = document.createElement("li"); li.textContent = p; perks.appendChild(li); });
      setText("lead-price", v.price || "");
      modal.className = "lead-modal" + (v.theme ? " theme-" + v.theme : "");
      submitBtn.textContent = v.submit;
      markShown();
      modal.classList.remove("is-done");
      formError.classList.remove("is-visible");
      lastFocus = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add("lead-locked");
      requestAnimationFrame(function () { overlay.classList.add("is-open"); });
      setTimeout(function () { document.getElementById("lead-name").focus(); }, 60);
      track("Contact", { content_name: current });
    }

    function close() {
      overlay.classList.remove("is-open");
      document.body.classList.remove("lead-locked");
      setTimeout(function () { overlay.hidden = true; }, 200);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    /* ---------- טריגרים אוטומטיים ----------
       פעם אחת לכל ביקור, אף פעם לא למי שכבר השאיר פרטים */
    var store = {
      get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
      set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) {} }
    };
    function markShown() { store.set("sessionStorage", "tz_popup_shown", "1"); }
    var loadedAt = Date.now();
    var isCommunityPage = !!document.querySelector('[data-page="community"]');
    var autoKind = isCommunityPage ? "exitCommunity" : "exit";

    function autoOpen(reason) {
      if (CFG.AUTO_POPUPS === false) return;
      if (store.get("localStorage", "tz_lead_done")) return;
      if (store.get("sessionStorage", "tz_popup_shown")) return;
      if (Date.now() - loadedAt < (CFG.MIN_SECONDS_BEFORE_AUTO || 8) * 1000) return;
      open(autoKind, "auto:" + reason);
    }

    /* 1. יציאת עכבר מראש החלון (מחשב) */
    document.addEventListener("mouseout", function (e) {
      if (!e.relatedTarget && e.clientY <= 0) autoOpen("exit-intent");
    });
    /* 2. זמן בעמוד */
    if (CFG.TIME_TRIGGER_SECONDS) setTimeout(function () { autoOpen("time"); }, CFG.TIME_TRIGGER_SECONDS * 1000);
    /* 3. עומק גלילה + 4. גלילה מהירה למעלה במובייל (סימן ליציאה) */
    var lastY = window.scrollY, lastT = Date.now();
    window.addEventListener("scroll", function () {
      var y = window.scrollY, now = Date.now();
      var depth = (y + window.innerHeight) / document.documentElement.scrollHeight * 100;
      if (CFG.SCROLL_TRIGGER_PERCENT && depth >= CFG.SCROLL_TRIGGER_PERCENT) autoOpen("scroll");
      var speed = (lastY - y) / Math.max(1, now - lastT);
      if (window.innerWidth < 900 && y > 600 && speed > 2.5) autoOpen("scroll-up");
      lastY = y; lastT = now;
    }, { passive: true });
    /* 5. חזרה ללשונית אחרי שיצאו ממנה */
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible" && Date.now() - loadedAt > 20000) autoOpen("tab-return");
    });

    /* כל כפתור עם data-lead פותח את הפופ-אפ */
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-lead]");
      if (!t) return;
      e.preventDefault();
      open(t.getAttribute("data-lead"), (t.textContent || "").trim());
    });

    overlay.querySelector(".lead-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var f = modal.querySelectorAll('a[href],button,input:not([tabindex="-1"]),select');
      var vis = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
      if (!vis.length) return;
      var first = vis[0], last = vis[vis.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    function fieldOk(name, ok) {
      var el = form.elements[name].closest(".lead-field");
      el.classList.toggle("has-error", !ok);
      form.elements[name].setAttribute("aria-invalid", ok ? "false" : "true");
      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.elements.website.value) return; /* בוט */
      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.replace(/[^\d+]/g, "");
      var email = form.elements.email.value.trim();
      var ok = fieldOk("name", name.length > 1);
      ok = fieldOk("phone", /^(\+?972|0)\d{8,9}$/.test(phone)) && ok;
      ok = fieldOk("email", !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) && ok;
      if (!ok) { var bad = form.querySelector(".has-error input,.has-error select"); if (bad) bad.focus(); return; }

      var lead = {
        name: name, phone: phone, email: email,
        business: form.elements.business.value,
        marketing_consent: form.elements.marketing.checked ? "כן" : "לא",
        interest: VARIANTS[current].eyebrow, button: source,
        page: location.pathname, referrer: document.referrer,
        utm: location.search, submitted_at: new Date().toISOString()
      };

      submitBtn.disabled = true; formError.classList.remove("is-visible");
      var send = CFG.LEAD_ENDPOINT
        ? fetch(CFG.LEAD_ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(lead) })
        : Promise.resolve();

      send.then(function () {
        track("Lead", { content_name: current });
        store.set("localStorage", "tz_lead_done", "1");
        showDone(lead);
        form.reset();
      }).catch(function () {
        formError.classList.add("is-visible");
      }).then(function () { submitBtn.disabled = false; });
    });

    function showDone(lead) {
      var v = VARIANTS[current];
      setText("lead-done-title", v.doneTitle); setText("lead-done-text", v.doneText);
      var actions = modal.querySelector(".lead-actions"); actions.innerHTML = "";
      if ((current === "community" || current === "exitCommunity") && CFG.COMMUNITY_PAYMENT_URL) {
        var pay = document.createElement("a");
        pay.className = "lead-btn-primary"; pay.href = CFG.COMMUNITY_PAYMENT_URL; pay.textContent = "להשלמת ההצטרפות – ₪50 לחודש";
        actions.appendChild(pay);
      }
      if (CFG.WHATSAPP) {
        var wa = document.createElement("a");
        wa.className = "lead-btn-wa"; wa.target = "_blank"; wa.rel = "noopener";
        wa.href = "https://wa.me/" + CFG.WHATSAPP + "?text=" + encodeURIComponent("היי, זה " + lead.name + " מהאתר של תאוצה – " + VARIANTS[current].eyebrow);
        wa.textContent = "להמשיך בוואטסאפ";
        actions.appendChild(wa);
      }
      modal.classList.add("is-done");
      setTimeout(function () { document.getElementById("lead-done-title").setAttribute("tabindex", "-1"); document.getElementById("lead-done-title").focus(); }, 30);
    }
  });
})();
