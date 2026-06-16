const transporter = require("../config/mailConfig")

async function sendMail({ to, subject, body }) {
    await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: to,
        subject: subject,
        html: body
    });
}

module.exports = {
    sendMail: sendMail
}