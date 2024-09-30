import express from 'express';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import morgan from 'morgan';
// import { sendEmail } from './utils/emailService.js';

import https from 'https';
import News from './models/newsModel.js'; // Import the News model

dotenv.config();

const app = express();

/// combined' is a standard Apache combined log output
app.use(morgan('combined'));
// Middleware
app.use(express.json());
app.use(cors({
  origin: "*"
}));

// User Routes
app.use('/api/users', userRoutes);

const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., Gmail, Outlook
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password
  },
});

// Example email data
// Helper function to create sample data dynamically
const createSampleData = (newsItems) => {
  return newsItems.map((newsItem) => {
    const { article_title, article_url, article_photo_url, source, post_time_utc, stocks_in_news } = newsItem;
    return {
      title: article_title,
      description: `
        <ul>
          <li>
            <strong>${article_title}:</strong> 
            <a href="${article_url}">
              Click here for the full article.
            </a>
            <br/>
            <img src="${article_photo_url}" alt="${article_title}" style="width: 100px;"/>
            <br/> Source: ${source}
          </li>
        </ul>
        <p>Posted on: ${new Date(post_time_utc).toUTCString()}</p>
        <p>Stocks in news: ${stocks_in_news.join(", ")}</p>
      `
    };
  });
};
// Example endpoint to send email
app.post('/send-email', async (req, res) => {
  const { email } = req.body;
  const subject = 'Your Daily Article Digest for stocks';

  try {
    // Fetch some news items from the database or create static sample news items
    const newsItems = await News.find()
      .select('article_title article_url article_photo_url source post_time_utc stocks_in_news')
      .sort({ post_time_utc: -1 })
      .limit(5); // Adjust as needed to include the latest news

    // Generate sample data dynamically
    const sampleData = createSampleData(newsItems);

    await sendEmail(email, subject, sampleData);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email.', details: error.message });
  }
});

export const generateEmailHTML = (articles, userEmail) => {
  // Generate HTML content for the email
  return `
  <h1>Latest Articles and Market Updates</h1>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
    ${articles.map(article => `
      <div style="border: 1px solid #ccc; padding: 10px; box-shadow: 2px 2px 12px rgba(0, 0, 0, 0.1); border-radius: 15px;">
        <h2 style="font-size: 16px; margin-bottom: 10px;">${article.article_title}</h2>
        <img src="${article.article_url}" alt="${article.article_title}" style="width: 100%; height: auto; border-radius: 10px; margin-bottom: 10px;" />
        <p style="font-size: 14px; color: #555;">Source: ${article.source}</p>
        <a href="${article.article_url}" style="display: inline-block; padding: 10px 20px; margin-top: 10px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Read More</a>
      </div>
    `).join('')}
  </div>
  <div style="text-align: center; margin-top: 20px;">
    <button id="surveyButton" style="padding: 10px 20px; font-size: 16px; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
      Give Survey
    </button>
  </div>
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
/////////////////////////////////////////////////////////
// New endpoint to fetch market trends

// New endpoint to fetch market trends
app.get('/api/market-trends', (req, res) => {
  const options = {
    method: 'GET',
    hostname: 'real-time-finance-data.p.rapidapi.com',
    port: null,
    path: '/market-trends?trend_type=MOST_ACTIVE&country=us&language=en',
    headers: {
      'x-rapidapi-key': '3161b74e94msh3003477d0f22c62p1f93d4jsn1f00eaa24400',
      'x-rapidapi-host': 'real-time-finance-data.p.rapidapi.com'
    }
  };

  const apiRequest = https.request(options, function (apiResponse) {
    const chunks = [];

    apiResponse.on('data', function (chunk) {
      chunks.push(chunk);
    });

    apiResponse.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const parsedData = JSON.parse(body.toString());

        // Extract news from the API response
        const newsArray = parsedData.data.news;

        // Save each news item to the database
        for (const newsItem of newsArray) {
          const { article_title, article_url, article_photo_url, source, post_time_utc, stocks_in_news } = newsItem;

          // Create a new news document
          const newNews = new News({
            article_title,
            article_url,
            article_photo_url,
            source,
            post_time_utc: new Date(post_time_utc), // Convert to Date object
            stocks_in_news,
          });

          // Save to database
          await newNews.save();
        }

        res.status(200).json({ message: 'News data saved successfully!', data: parsedData });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch and save market trends.', details: error.message });
      }
    });
  });

  apiRequest.on('error', (error) => {
    res.status(500).json({ error: 'Failed to fetch market trends.', details: error.message });
  });

  apiRequest.end();
});

///////////////////////////////////////////////////////
//Get the saved news data

// New endpoint to fetch news from the database
app.get('/news', async (req, res) => {
  try {
    // Retrieve selected fields from all news in the database
    const newsData = await News.find()
      .select('article_title article_url article_photo_url source')
      .sort({ post_time_utc: -1 }); // Sort by latest news first

    // Send the news data as a response
    res.status(200).json({ message: 'News retrieved successfully!', data: newsData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve news.', details: error.message });
  }
});


/////////////////////////////////////////////////////////
// Sample GET endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Success', status: 'OK' });
});

app.get('/test', (req, res) => {
  res.status(200).json({ message: 'same as using /', status: 'OK' });
});


// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
