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

export async function sendNewListingNotification(
  to: string,
  opts: { propertyId: number; title: string; landlordName: string; wardNumber: number; tole: string; monthlyRent: number }
) {
  const { propertyId, title, landlordName, wardNumber, tole, monthlyRent } = opts;
  await getTransporter().sendMail({
    from: `"GharBhada" <${GMAIL_USER}>`,
    to,
    subject: `GharBhada — नयाँ listing स्वीकृतिको पर्खाइमा: ${title}`,
    text: `${landlordName} ले नयाँ property "${title}" (वडा ${wardNumber}, ${tole}, रु ${monthlyRent}/महिना) पेश गर्नुभयो। Admin Dashboard मा गएर स्वीकार/अस्वीकार गर्नुहोस्। Property ID: ${propertyId}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563EB;">घर<span style="color:#F59E0B">भाडा</span></h2>
        <p>नयाँ listing स्वीकृतिको पर्खाइमा छ:</p>
        <div style="background: #F3F4F6; padding: 14px 18px; border-radius: 8px;">
          <p style="margin: 0 0 6px;"><strong>${title}</strong></p>
          <p style="margin: 0; color: #4B5563; font-size: 14px;">घरबेटी: ${landlordName}</p>
          <p style="margin: 0; color: #4B5563; font-size: 14px;">वडा ${wardNumber}, ${tole} — रु ${monthlyRent.toLocaleString('en-IN')}/महिना</p>
        </div>
        <p style="color: #6B7280; font-size: 13px; margin-top: 12px;">Admin Dashboard मा गएर स्वीकार/अस्वीकार गर्नुहोस्।</p>
      </div>
    `,
  });
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
