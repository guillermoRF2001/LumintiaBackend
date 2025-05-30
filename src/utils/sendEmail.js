const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    if (Array.isArray(to)) {
      to = to.filter(email => typeof email === "string" && email.includes("@")).join(",");
    }


    if (!to || typeof to !== "string" || !to.includes("@")) {
      console.error("❌ Dirección de email no válida o vacía:", to);
      throw new Error("Dirección de email inválida o no definida");
    }

    const mailOptions = {
      from: `"Academy Calendar" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`❌ Error enviando correo a ${to}:`, error.message);
  }
};

module.exports = sendEmail;
