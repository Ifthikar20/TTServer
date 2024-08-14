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
  <h1>Latest Articles and Market Updates</h1>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
    ${articles.map(article => `
      <div style="border: 1px solid #ccc; padding: 10px; box-shadow: 2px 2px 12px rgba(0, 0, 0, 0.1); height: 150px; display: flex; flex-direction: column; justify-content: space-between; border-radius: 15px;">
        <h2 style="font-size: 16px; margin-bottom: 10px;">${article.title}</h2>
        <p style="margin-top: auto;">${article.description}</p>
      </div>
    `).join('')}
  
  </div>
  <button id="surveyButton" style="margin-top: 20px; padding: 10px 20px; font-size: 16px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
    Give Survey
  </button>
  <script>
    document.getElementById('surveyButton').addEventListener('click', function() {
      fetch('https://tt-server-two.vercel.app/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: '${userEmail}' })
      })
      .then(response => response.json())
      .then(data => {
        alert('Survey request sent successfully!');
      })
      .catch(error => {
        console.error('Error sending survey request:', error);
        alert('Failed to send survey request.');
      });
    });
  </script>
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
cron.schedule('0 16 * * *', () => {
  const latestArticles = [
    { title: 'Article 1', description: 'Description of Article 1' },
    { title: 'Article 2', description: 'Description of Article 2' },
  ];
  console.log('Running the scheduled task at 4 PM CST');
  sendBulkEmails('Latest Articles and Market Updates', latestArticles);
}, {
  scheduled: true,
  timezone: "America/Chicago" // CST timezone
});
