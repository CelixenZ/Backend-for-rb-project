import transporter from "../../config/mail.config";

export async function sendMail({ to, subject, body }) {
    await transporter.sendMail({
        from: process.env.MAIL_USER,
        to: to,
        subject: subject,
        html: body
    });
}

