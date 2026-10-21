# תאוצה סטודיו – אתר

סטטי לגמרי: `index.html`, `community.html`, `privacy.html`, `terms.html`, `accessibility.html`.
הרצה מקומית: `npm start`.

## מה מגדירים לפני עלייה – הכל בקובץ אחד: `assets/config.js`
| שדה | מה זה |
|---|---|
| `LEAD_ENDPOINT` | כתובת שאליה נשלחים הלידים. הוראות התקנה (Google Sheet + מייל התראה): `tools/google-sheet-leads.gs` |
| `WHATSAPP` | מספר וואטסאפ (972…) – מוסיף כפתור "להמשיך בוואטסאפ" אחרי השארת פרטים |
| `META_PIXEL_ID` | מזהה פיקסל – נטען אוטומטית ושולח `Lead` בכל השארת פרטים |
| `COMMUNITY_PAYMENT_URL` | לינק תשלום לקהילה – מופיע אחרי השארת פרטים בפופ-אפ הקהילה |
| `AUTO_POPUPS`, `TIME_TRIGGER_SECONDS`, `SCROLL_TRIGGER_PERCENT` | פופ-אפים אוטומטיים |

## פופ-אפים
- כל קישור עם `data-lead="call" | "community" | "contact"` פותח פופ-אפ.
- אוטומטי (פעם אחת לביקור, לא למי שכבר השאיר פרטים): יציאת עכבר, זמן בעמוד, עומק גלילה, גלילה מהירה למעלה במובייל, חזרה ללשונית.
  בדף הבית – פופ-אפ "שיחת היכרות"; בדף הקהילה – פופ-אפ קהילה.

## עמודים משפטיים
טיוטות – להשלים את הפרטים בסוגריים `[...]` ולהעביר לעורך/ת דין.

## מחבר סמוב (server.js)

האתר רץ עכשיו על `node server.js`: מגיש את הקבצים (לפי serve.json) ומוסיף:

- `POST /api/lead`: טפסי האתר → איש קשר ברשימה בסמוב (שיחה / קהילה / שאלון)
- `POST /api/cal`: Webhook מ-Cal.com → "נקבעה שיחה", יציאה מרצפי הנדנוד
- `GET /api/health`: מה מוגדר

משתני סביבה ב-Railway: `SMOOVE_API_KEY`, `SMOOVE_LIST_CALL`, `SMOOVE_LIST_COMMUNITY`,
`SMOOVE_LIST_QUESTIONNAIRE`, `SMOOVE_LIST_BOOKED`, `SMOOVE_LIST_CANCELLED` (לא חובה),
`SMOOVE_FIELDS` (לא חובה, JSON של שדות מותאמים), `CAL_WEBHOOK_SECRET`.
בלי מפתח סמוב האתר ממשיך לעבוד והלידים ממשיכים להגיע למייל.
