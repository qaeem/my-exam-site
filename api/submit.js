// api/submit.js

// هذا يعرّف أنّ Vercel يجب أن لا يحلل الـ body أوتوماتيكيًا
exports.config = {
  api: {
    bodyParser: false,
  },
};

const formidable = require("formidable");
const fs = require("fs");
const FormData = require("form-data");
const fetch = require("node-fetch");

// متغيّرات البيئة (أدرِجها في Vercel Settings → Environment Variables)
const TELEGRAM_BOT_TOKEN = process.env.7896001866:AAEseDBzINmmyHYyR77qCcqds0Zh38x6GJs;
const TELEGRAM_CHAT_ID = process.env.6067843686;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // 1) التحقق من أن متغيّرات البيئة موجودة
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return res.status(500).send("Server misconfiguration");
  }

  // 2) استخدام formidable لاستخراج الحقول والملف
  const form = formidable({
    multiples: false,
    keepExtensions: true, // يحفظ الملفّ بامتداده الأصلي مؤقتًا
    maxFileSize: 10 * 1024 * 1024, // أقصى حجم: 10 ميغابايت
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable Error:", err);
      return res.status(400).send("Error parsing form data");
    }

    // 3) جلب الحقول
    const name = fields.name || "";
    const telegram = fields.telegram || "";
    const grade = fields.grade || "";

    // 4) جلب الملف المرفوع
    const file = files.solution;
    if (!file) {
      return res.status(400).send("No file uploaded");
    }

    // 5) نقرأ الملف من المسار المؤقت (file.path) إلى Buffer
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(file.path);
    } catch (readErr) {
      console.error("Error reading uploaded file:", readErr);
      return res.status(500).send("Error reading uploaded file");
    }

    // 6) بناء رسالة FormData لإرسالها إلى Telegram
    try {
      const tgForm = new FormData();
      tgForm.append("chat_id", TELEGRAM_CHAT_ID);

      const caption =
        `📚 *اختبار أكاديمي بلس*\n\n` +
        `*الاسم:* ${name}\n` +
        `*تيليجرام:* ${telegram}\n` +
        `*الصف:* ${grade}`;
      tgForm.append("caption", caption);
      tgForm.append("parse_mode", "Markdown");

      // append photo: (Buffer, original filename, mime)
      tgForm.append("photo", fileBuffer, {
        filename: file.originalFilename || "solution.jpg",
        contentType: file.mimetype,
      });

      const tgRes = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          headers: tgForm.getHeaders(),
          body: tgForm,
        }
      );
      const tgJson = await tgRes.json();
      if (!tgJson.ok) {
        console.error("Telegram API Error:", tgJson);
        return res.status(500).send("Failed to send to Telegram");
      }
    } catch (tgErr) {
      console.error("Error sending to Telegram:", tgErr);
      return res.status(500).send("Error sending to Telegram");
    }

    // 7) إذا نجح كل شيء، نعيد توجيه المستخدم إلى صفحة الشكر
    res.writeHead(302, { Location: "/thankyou.html" });
    res.end();
  });
};
