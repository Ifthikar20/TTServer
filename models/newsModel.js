import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  article_title: String,
  article_url: String,
  article_photo_url: String,
  source: String,
  post_time_utc: Date,
  stocks_in_news: Array, // Array to store stock-related data in the news
});

const News = mongoose.model('News', newsSchema);

export default News;
