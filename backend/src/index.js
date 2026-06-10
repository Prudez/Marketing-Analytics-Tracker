require('dotenv').config();
const express = require('express');
const cors = require('cors');

const propertiesRouter = require('./routes/properties');
const analyticsRouter = require('./routes/analytics');

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(',') : '*',
}));
app.use(express.json());

app.use('/api/properties', propertiesRouter);
app.use('/api/analytics', analyticsRouter);
app.get('/api/platforms/status', (req, res) => {
  res.json({
    success: true,
    data: {
      facebook: !!process.env.FACEBOOK_PAGE_TOKEN,
      instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
      tiktok: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
      twitter: !!process.env.TWITTER_BEARER_TOKEN,
      buyrent: true,
    },
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
