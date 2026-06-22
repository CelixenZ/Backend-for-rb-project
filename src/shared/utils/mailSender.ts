import { env } from "../../config/env.config";
import { transporter } from "../../config/mail.config";

interface SendMailProps {
    to: string;
    subject: string;
    html: string;
    text: string;
}

export async function sendMail({ to, subject, html, text }: SendMailProps) {
    await transporter.sendMail({
        from: env.MAIL_USER,
        to: to,
        subject: subject,
        html: html,
        text: text,
    });
}

