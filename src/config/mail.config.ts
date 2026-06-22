import mailer from "nodemailer";
import path from "path";
import { env } from "./env.config";

export const transporter = mailer.createTransport({
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    secure: env.MAIL_SECURE || false,
    auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PWD
    },
    tls: {
        rejectUnauthorized: false,
    },
    family: 4
} as any);

export const TEMPLATE_LOCATION = {
    REMINDER_ALERT: path.join(__dirname, "..", "template", "emailReminder.html")
}