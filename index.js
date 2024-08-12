import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import morgan from 'morgan';
import { sendEmail } from './utils/emailService.js';

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
  { title: 'Article 1', description: 'This is the first article' },
  { title: 'Article 2', description: 'This is the second article' },
];

// Example endpoint to send email
app.post('/send-email', async (req, res) => {
  const { email } = req.body;
  const subject = 'Your Daily Article Digest';

  try {
    await sendEmail(email, subject, sampleData);
    res.status(200).json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

// Sample GET endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Success', status: 'OK' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
