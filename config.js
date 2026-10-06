// العلامة من 150: ثلث للتعبير الكتابي (50) وثلثان للأسئلة الاختيارية (100)
window.SCORING = { total: 150, writingMax: 50, mcMax: 100 };
// מנוי ידני (בלי שרת): הלקוח משלם ב-Bit, שולחים לו קוד גישה (node tools/newcode.js)
// paywall=false => כל הבחינות פתוחות. כדי להפעיל: paywall=true והשלימו bitLink / whatsapp.
window.PLAN = {
  paywall: false, freeExams: 2, price: 50, currency: "₪",
  bitLink: "",      // קישור תשלום ב-Bit, למשל "https://www.bitpay.co.il/app/..."
  whatsapp: "",     // מספר וואטסאפ בפורמט בינלאומי בלי +, למשל "972501234567"
  codes: []         // { h: sha256(code), until: "YYYY-MM-DD" }
};
