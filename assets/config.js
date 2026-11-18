/* =========================================================
   הגדרות האתר – תאוצה סטודיו
   משנים רק את הערכים כאן. שדה ריק = הפיצ'ר כבוי.
   ========================================================= */
window.TAUTZA_CONFIG = {
  // לאן נשלחים הלידים: מייל (דרך FormSubmit). בליד הראשון מגיע מייל אישור – לוחצים "Activate" פעם אחת.
  // אחרי האישור FormSubmit שולחים כתובת מוסווה (מחרוזת אקראית) – אפשר להחליף בה את המייל כאן כדי שלא יופיע בקוד.
  LEAD_EMAIL: "lev.yuval@outlook.com",

  // המחבר לסמוב שרץ בתוך האתר (server.js). המפתחות והרשימות מוגדרים ב-Railway, לא כאן.
  LEAD_ENDPOINT: "/api/lead",

  // מספר וואטסאפ בפורמט בינלאומי בלי + ובלי מקפים, למשל "972501234567"
  // אם מוגדר: אחרי השארת פרטים יופיע כפתור "להמשיך בוואטסאפ"
  WHATSAPP: "",

  // מזהה פיקסל של Meta (מספר בלבד). אם מוגדר – הפיקסל נטען ונשלח אירוע Lead בכל השארת פרטים
  META_PIXEL_ID: "1837315184360844",

  // לינק לדף התשלום של הקהילה (₪50 לחודש). אם מוגדר – אחרי השארת פרטים בקהילה יופיע כפתור תשלום
  COMMUNITY_PAYMENT_URL: "",

  // Momentum (עמוד /momentum-studio): לינק לתשלום המנוי ב-PayPal (€79 לחודש × 3).
  // אם ריק – אחרי ההרשמה מופיעה הודעה שלינק התשלום יישלח במייל.
  MOMENTUM_PAYMENT_URL: "https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-0UR84934S3235554VNL6EHPY",
  // כפתור המנוי של PayPal שמוצג בדף אחרי ההרשמה (€79 × 3). ה-Client ID ציבורי, זה בסדר שהוא כאן.
  MOMENTUM_PAYPAL_CLIENT_ID: "BAAJK6YNlz0zL--byEGBaeVgOFvnXP8hdQKnJabx5qikq6lpD6TmDMaJg9lXrPUdD0ISbACdJ4bWkeMHQo",
  MOMENTUM_PAYPAL_PLAN_ID: "P-0UR84934S3235554VNL6EHPY",
  // תשלום מלא חד-פעמי ב-PayPal (כולל כרטיס בלי חשבון). 0 = האפשרות לא מוצגת.
  MOMENTUM_FULL_PRICE_EUR: 222,
  // וובינר Momentum (עמוד /momentum-studio/webinar)
  // DATE בפורמט ISO עם אזור זמן (שעון מרכז אירופה: +01:00 בחורף). ריק = "Date announced soon".
  MOMENTUM_WEBINAR: {
    DATE: "",              // לדוגמה: "2026-12-03T19:00:00+01:00"
    MINUTES: 60,
    ZOOM_URL: ""           // לינק הזום – מוצג רק בעמוד התודה אחרי הרשמה
  },
  // וואטסאפ אישי לעמוד Momentum בלבד (לא משפיע על שאר האתר)
  MOMENTUM_WHATSAPP: "972556884767",

  // לינק לאירוע ב-Cal.com, למשל "https://cal.com/yuval/intro". מופיע אחרי פופ-אפ שיחה ובסוף השאלון, עם שם ומייל ממולאים
  CALENDAR_URL: "https://cal.com/yuval-livne-ynztcn/20min",

  // ----- פופ-אפים אוטומטיים (פעם אחת לביקור, לא מוצג למי שכבר השאיר פרטים) -----
  AUTO_POPUPS: true,            // false = מכבה את כל הטריגרים האוטומטיים
  MIN_SECONDS_BEFORE_AUTO: 8,   // לא לקפוץ בשניות הראשונות
  TIME_TRIGGER_SECONDS: 45,     // קפיצה אחרי X שניות בעמוד (0 = כבוי)
  SCROLL_TRIGGER_PERCENT: 70    // קפיצה אחרי גלילה של X% מהעמוד (0 = כבוי)
  // תמיד פעילים כש-AUTO_POPUPS=true: יציאת עכבר (מחשב), גלילה מהירה למעלה (מובייל), חזרה ללשונית
};
