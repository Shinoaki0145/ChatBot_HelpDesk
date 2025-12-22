import {
    Transporter, 
    createTransport, 
    SendMailOptions
} from 'nodemailer';
import { google } from 'googleapis';

const oAuth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

let transporter: Transporter;

async function getTransporter() : Promise<Transporter> {
    if (transporter) {
        return transporter;
    }

    const accessToken = await oAuth2Client.getAccessToken();

    transporter = createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: 'aidomatuikobik@gmail.com',
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken: accessToken.token
        }
    });
    return transporter;
}

export async function sendEmail(options: SendMailOptions) {
    const mailOptions: SendMailOptions = {
        from: 'ChatBot-HelpDesk <aidomatuikobik@gmail.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    const transporter = await getTransporter();
    return transporter.sendMail(mailOptions);
}
