import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import UserModel from '../models/userModel.js';
import cron from 'node-cron';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., Gmail, Outlook
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

export const generateEmailHTML = (articles, userEmail) => {
  // Generate HTML content for the email
  return `
  ${articles}
  `;
};

export const sendEmail = async (to, subject, articles) => {
  const htmlContent = generateEmailHTML(articles, to);
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: 'Check out the latest articles and stock market updates!',
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

//////////////////////////////////////////////////////////////////////////////////////////////
// Function to send bulk emails to all users
export const sendBulkEmails = async (subject, articles) => {
  // Check the SEND_BULK_EMAILS environment variable
  if (process.env.SEND_BULK_EMAILS !== 'true') {
    console.log('Bulk email sending is disabled.');
    return;
  }

  try {
    // Connect to MongoDB (if not already connected elsewhere)
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Fetch all users' emails
    const users = await UserModel.find({}, 'email');
    const emailAddresses = users.map(user => user.email);

    // Send email to each user
    for (const email of emailAddresses) {
      await sendEmail(email, subject, articles);
    }

    console.log('Bulk emails sent to all users.');
  } catch (error) {
    console.error('Error sending bulk emails:', error);
  } finally {
    mongoose.connection.close(); // Close the connection after sending emails
  }
};

// Schedule the cron job to send emails at 4 PM CST daily
// cron.schedule('0 16 * * *', () => {
//   const latestArticles = [
//     { title: 'Article 1', description: 'Description of Article 1' },
//     { title: 'Article 2', description: 'Description of Article 2' },
//   ];
//   console.log('Running the scheduled task at 4 PM CST');
//   sendBulkEmails('Latest Articles and Market Updates', latestArticles);
// }, {
//   scheduled: true,
//   timezone: "America/Chicago" // CST timezone
// });
