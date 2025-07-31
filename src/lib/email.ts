import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter based on configuration
function createTransporter() {
  // If SMTP settings are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Gmail configuration (most common free option)
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // Use App Password, not regular password
      },
    });
  }

  // Ethereal for testing (creates test accounts automatically)
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  return null;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@lha-donate.org';
  
  // In development without email config, just log the email
  const transporter = createTransporter();
  if (!transporter) {
    console.log('📧 EMAIL (Development Mode - No SMTP configured):');
    console.log(`📤 To: ${to}`);
    console.log(`📤 From: ${fromEmail}`);
    console.log(`📋 Subject: ${subject}`);
    console.log(`📄 HTML: ${html}`);
    console.log('---');
    console.log('💡 To send real emails, configure GMAIL_USER and GMAIL_PASS in .env');
    return { success: true, message: 'Email logged in development mode' };
  }

  try {
    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${to}`);
    console.log('📧 Message ID:', info.messageId);
    
    // For Ethereal, provide preview URL
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, message: 'Email sent successfully', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    return { 
      success: false, 
      message: error?.message || 'Failed to send email',
      error 
    };
  }
}