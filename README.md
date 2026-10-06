# יעלנט – הדמיית בחינה

אתר סטטי (HTML/CSS/JS). פותחים `index.html` או מעלים לכל אחסון סטטי.

## הפעלת Firebase (התחברות, סנכרון, מנוי, Analytics)
1. ב-[Firebase Console](https://console.firebase.google.com) יוצרים פרויקט, ומוסיפים Web app.
2. מדביקים את ה-config ב-`firebase-config.js`.
3. Authentication > Sign-in method: מפעילים Google ו-Email/Password. מוסיפים את הדומיין של האתר ל-Authorized domains.
4. Firestore Database: יוצרים בסיס נתונים, ובלשונית Rules מדביקים את `firestore.rules`.
5. אחסון: `npm i -g firebase-tools`, `firebase login`, `firebase init hosting` (public = `.`), `firebase deploy`.
   (בתוך Artifact של Claude הרשת חסומה, לכן Firebase יעבוד רק באחסון אמיתי.)

## הפעלת מנוי ידני (Bit)
- `config.js`: `paywall: true`, ממלאים `bitLink` ו-`whatsapp`.
- לקוח ששילם: ב-Firebase Console > Firestore יוצרים מסמך `users/<uid של הלקוח>` עם שדה `premiumUntil` (מחרוזת `2026-12-31`).
  את ה-uid רואים ב-Authentication > Users לפי האימייל.
- בלי Firebase: `node tools/newcode.js 2026-12-31` ושולחים ללקוח את הקוד.
