const express = require('express');
const router = express.Router();

// GET /api/platforms/status — check if each platform token is configured
router.get('/status', (req, res) => {
  const status = {
    facebook: !!process.env.FACEBOOK_PAGE_TOKEN,
    instagram: !!process.env.INSTAGRAM_ACCESS_TOKEN,
    tiktok: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    twitter: !!process.env.TWITTER_BEARER_TOKEN,
    buyrent: true, // Buyrent uses manual stats, always "available"
  };

  res.json({ success: true, data: status });
});

module.exports = router;
