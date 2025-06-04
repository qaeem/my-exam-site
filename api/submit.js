// api/submit.js

import Busboy from "busboy";
import FormData from "form-data";
import fetch from "node-fetch";

const TELEGRAM_BOT_TOKEN = process.env.7896001866:AAEseDBzINmmyHYyR77qCcqds0Zh38x6GJs;
const TELEGRAM_CHAT_ID = process.env.6067843686;

export default async function handler(req, res) {
  if (req.method === "POST") {
    // 1) التأكد أن الطلب multipart/form-data
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return res.status(400).send("نوع الطلب غير صحيح");
    }

    const busboy = new Busboy({ headers: req.headers });
    let student = { name: "", telegram: "", grade: "" };
    let fileBuffer = null;
    let fileName = "";
    let fileMime = "";

    // نفكّ حزمة الـ form-data
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

      busboy.on("finish", async () => {
        try {
          if (!fileBuffer) {
            return reject(new Error("لم يتم تحميل صورة الحل."));
          }

          // 2) إرسال البيانات + الصورة إلى بوت التليجرام
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
            console.error("خطأ من التليجرام:", tgJson);
            return reject(new Error("فشل إرسال الصورة إلى التليجرام"));
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      });

      // ننهي القراءة للـ body
      busboy.end(req.rawBody);
    });

    // 3) إذا نجح كل شيء، نعيد توجيه الطالب إلى صفحة الشكر
    res.writeHead(302, { Location: "/thankyou.html" });
    res.end();
  } else {
    res.status(405).send("Method Not Allowed");
  }
}
