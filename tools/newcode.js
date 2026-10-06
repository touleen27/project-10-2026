// יצירת קוד גישה: node tools/newcode.js 2026-12-31
// מדפיס את הקוד (לשלוח ללקוח) ואת השורה להדבקה ב-config.js בתוך PLAN.codes
const crypto = require("crypto");
const until = process.argv[2] || new Date(Date.now() + 31 * 864e5).toISOString().slice(0, 10);
const code = crypto.randomBytes(6).toString("hex").toUpperCase();
const h = crypto.createHash("sha256").update(code).digest("hex");
console.log("קוד ללקוח:", code, "\nלהדביק ב-codes:", `{ h: "${h}", until: "${until}" },`);
