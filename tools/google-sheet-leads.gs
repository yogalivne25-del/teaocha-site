/**
 * לידים מהאתר של תאוצה → Google Sheet (+ מייל התראה)
 *
 * התקנה (5 דקות, פעם אחת):
 * 1. פותחים Google Sheet חדש בשם "לידים – תאוצה".
 * 2. תפריט: הרחבות ← Apps Script. מוחקים את מה שיש ומדביקים את כל הקובץ הזה.
 * 3. משנים למטה את NOTIFY_EMAIL לכתובת שלך (או משאירים ריק בלי התראות).
 * 4. פריסה (Deploy) ← פריסה חדשה ← סוג: Web app
 *      Execute as: Me   |   Who has access: Anyone
 *    מאשרים הרשאות.
 * 5. מעתיקים את ה-Web app URL ומדביקים ב-assets/config.js בשדה LEAD_ENDPOINT.
 */
var NOTIFY_EMAIL = "";

var COLUMNS = ["submitted_at", "name", "phone", "email", "business", "interest",
               "marketing_consent", "button", "page", "utm", "referrer"];
var HEADERS = ["תאריך", "שם", "טלפון", "אימייל", "סוג עסק", "מתעניין ב",
               "הסכמה לדיוור", "כפתור/טריגר", "עמוד", "UTM", "הגיע מ"];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents || "{}");
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.setRightToLeft(true);
    }
    sheet.appendRow(COLUMNS.map(function (k) {
      var v = data[k] == null ? "" : String(data[k]).slice(0, 500);
      return /^[=+\-@]/.test(v) ? "'" + v : v; // הגנה מנוסחאות זדוניות
    }));
    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, "ליד חדש מתאוצה: " + (data.name || ""),
        HEADERS.map(function (h, i) { return h + ": " + (data[COLUMNS[i]] || ""); }).join("\n"));
    }
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}
