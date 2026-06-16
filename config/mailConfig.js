const mailer = require("nodemailer");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, "..", ".env") });

const transporter = mailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT),
    secure: Boolean(process.env.MAIL_SECURE) || false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PWD
    }
});

module.exports = transporter;