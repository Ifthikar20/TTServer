import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import morgan from 'morgan';
import { sendEmail } from './utils/emailService.js';
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

// Example email data
const sampleData = [
  { title: "Today's Gainers", description: `
    <ul>
      <li><strong>Starbucks Corporation (SBUX):</strong> Up by 24.50%, driven by strong earnings and positive market sentiment.</li>
      <li><strong>The Estée Lauder Companies Inc. (EL):</strong> Increased by 6.64%, benefiting from positive earnings reports.</li>
      <li><strong>NVIDIA Corporation (NVDA):</strong> Rose by 6.53%, continuing its strong performance in the tech sector.</li>
      <li><strong>Intel Corporation (INTC):</strong> Up by 5.73%, buoyed by new product announcements and market recovery.</li>
      <li><strong>Tesla, Inc. (TSLA):</strong> Gained 5.24%, likely due to strong sales figures and market optimism.</li>
    </ul>
  `},
  { title: "Today's Losers", description: `
    <ul>
      <li><strong>Chipotle Mexican Grill, Inc. (CMG):</strong> Dropped by 7.50%, impacted by weaker-than-expected earnings.</li>
      <li><strong>Baxter International Inc. (BAX):</strong> Fell by 6.55%, facing challenges in its core markets.</li>
      <li><strong>EQT Corporation (EQT):</strong> Down by 3.44%, possibly due to fluctuations in energy prices.</li>
      <li><strong>Valero Energy Corporation (VLO):</strong> Decreased by 2.61%, reflecting broader energy sector pressures.</li>
      <li><strong>Occidental Petroleum Corporation (OXY):</strong> Dropped by 2.58%, amid lower oil prices and market conditions.</li>
    </ul>
  `}
];
// Example endpoint to send email
app.post('/send-email', async (req, res) => {
  const { email } = req.body;
  const subject = 'Your Daily Article Digest for stocks';

  try {
    await sendEmail(email, subject, sampleData);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

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
app.get('/api/news', async (req, res) => {
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
