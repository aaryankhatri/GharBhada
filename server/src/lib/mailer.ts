import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

export class MailerConfigError extends Error {}

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new MailerConfigError(
      'GMAIL_USER / GMAIL_APP_PASSWORD सेट गरिएको छैन। https://myaccount.google.com/apppasswords बाट App Password लिएर server/.env मा राख्नुहोस्।'
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(to: string, code: string) {
  await getTransporter().sendMail({
    from: `"GharBhada" <${GMAIL_USER}>`,
    to,
    subject: 'GharBhada — Password Reset Code',
    text: `तपाईंको password reset code: ${code}\n\nयो code १० मिनेटमा expire हुन्छ। यदि तपाईंले यो अनुरोध गर्नुभएको छैन भने यो email बेवास्ता गर्नुहोस्।`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563EB;">घर<span style="color:#F59E0B">भाडा</span></h2>
        <p>तपाईंको password reset code:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; background: #F3F4F6; padding: 12px 20px; border-radius: 8px; text-align: center;">${code}</p>
        <p style="color: #6B7280; font-size: 13px;">यो code १० मिनेटमा expire हुन्छ। यदि तपाईंले यो अनुरोध गर्नुभएको छैन भने यो email बेवास्ता गर्नुहोस्।</p>
      </div>
    `,
  });
}
