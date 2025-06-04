// api/submit.js

// 1) نُعطّل تحليل الـ body الافتراضي في Vercel:
exports.config = {
  api: {
    bodyParser: false,
  },
};

const Busboy = require("busboy");
const FormData = require("form-data");
const fetch = require("node-fetch");

const TELEGRAM_BOT_TOKEN = process.env.7896001866:AAEseDBzINmmyHYyR77qCcqds0Zh38x6GJs;
const TELEGRAM_CHAT_ID = process.env.6067843686;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // 2) التأكد من متغيّرات البيئة
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return res.status(500).send("Server misconfiguration");
  }

  // 3) التحقق من Content-Type
  const contentType = req.headers["content-type"] || "";
  if (!contentType.startsWith("multipart/form-data")) {
    console.error("Bad Content-Type:", contentType);
    return res.status(400).send("Bad Request: Expected multipart/form-data");
  }

  // 4) نستخدم Busboy لفكّ الحقول والملف
  const busboy = new Busboy({ headers: req.headers });
  let student = { name: "", telegram: "", grade: "" };
  let fileBuffer = null, fileName = "", fileMime = "";

  try {
    await new Promise((resolve, reject) => {
      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname === "solution") {
          fileName = filename;
          fileMime = mimetype;
          const chunks = [];
          file.on("data", (data) => chunks.push(data));
          file.on("end", () => {
            fileBuffer = Buffer.concat(chunks);
          });
        } else {
          file.resume();
        }
      });

      busboy.on("field", (fieldname, val) => {
        if (fieldname === "name") student.name = val;
        else if (fieldname === "telegram") student.telegram = val;
        else if (fieldname === "grade") student.grade = val;
      });

      busboy.on("finish", () => {
        if (!fileBuffer) {
          return reject(new Error("No file uploaded"));
        }
        resolve();
      });

      // نوصل الجسم الخام لـ Busboy
      busboy.end(req.rawBody);
    });
  } catch (err) {
    console.error("Busboy Error:", err);
    return res.status(400).send("Error parsing form data");
  }

  // 5) إرسال البيانات والصورة إلى Telegram
  try {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_CHAT_ID);
    const caption =
      `📚 *اختبار أكاديمي بلس*\n\n` +
      `*الاسم:* ${student.name}\n` +
      `*تيليجرام:* ${student.telegram}\n` +
      `*الصف:* ${student.grade}`;
    form.append("caption", caption);
    form.append("parse_mode", "Markdown");
    form.append("photo", fileBuffer, {
      filename: fileName,
      contentType: fileMime,
    });

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: form.getHeaders(),
        body: form,
      }
    );
    const tgJson = await tgRes.json();
    if (!tgJson.ok) {
      console.error("Telegram API Error:", tgJson);
      return res.status(500).send("Failed to send to Telegram");
    }
  } catch (err) {
    console.error("Telegram Send Error:", err);
    return res.status(500).send("Error sending to Telegram");
  }

  // 6) عند النجاح، نعيد توجيه المستخدم إلى صفحة الشكر
  res.writeHead(302, { Location: "/thankyou.html" });
  res.end();
};
