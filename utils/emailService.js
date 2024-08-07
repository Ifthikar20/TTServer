import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., Gmail, Outlook
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

export const generateEmailHTML = (articles) => {
  // Generate HTML content for the email
  return `
    <h1>Latest Articles</h1>
    <ul>
      ${articles.map(article => `<li>${article.title} - ${article.description}</li>`).join('')}
    </ul>
  `;
};

export const sendEmail = async (to, subject, articles) => {
  const htmlContent = generateEmailHTML(articles);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: 'Check out the latest articles!',
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
