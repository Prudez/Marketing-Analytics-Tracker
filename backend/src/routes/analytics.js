const express = require('express');
const router = express.Router();
const db = require('../db');
const facebook = require('../services/facebook');
const instagram = require('../services/instagram');
const tiktok = require('../services/tiktok');
const twitter = require('../services/twitter');
const buyrent = require('../services/buyrent');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const services = { facebook, instagram, tiktok, twitter, buyrent };

function isCacheStale(fetchedAt) {
  if (!fetchedAt) return true;
  return Date.now() - new Date(fetchedAt).getTime() > CACHE_TTL_MS;
}

function saveCache(propertyId, platform, data) {
  const existing = db
    .prepare('SELECT id FROM analytics_cache WHERE property_id = ? AND platform = ?')
    .get(propertyId, platform);

  if (existing) {
    db.prepare(`
      UPDATE analytics_cache
      SET fetched_at = datetime('now'), impressions = ?, likes = ?, comments = ?,
          shares = ?, clicks = ?, reach = ?, extra_json = ?
      WHERE property_id = ? AND platform = ?
    `).run(
      data.impressions || 0, data.likes || 0, data.comments || 0,
      data.shares || 0, data.clicks || 0, data.reach || 0,
      JSON.stringify(data), propertyId, platform
    );
  } else {
    db.prepare(`
      INSERT INTO analytics_cache
        (property_id, platform, impressions, likes, comments, shares, clicks, reach, extra_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      propertyId, platform,
      data.impressions || 0, data.likes || 0, data.comments || 0,
      data.shares || 0, data.clicks || 0, data.reach || 0,
      JSON.stringify(data)
    );
  }
}

async function fetchForLink(link) {
  const service = services[link.platform];
  if (!service) return { error: true, message: `Unknown platform: ${link.platform}`, data: null };

  const cacheRow = db
    .prepare('SELECT * FROM analytics_cache WHERE property_id = ? AND platform = ?')
    .get(link.property_id, link.platform);

  if (cacheRow && !isCacheStale(cacheRow.fetched_at)) {
    return {
      error: false,
      stale: false,
      data: {
        platform: link.platform,
        impressions: cacheRow.impressions,
        likes: cacheRow.likes,
        comments: cacheRow.comments,
        shares: cacheRow.shares,
        clicks: cacheRow.clicks,
        reach: cacheRow.reach,
      },
    };
  }

  const idOrPropertyId = link.platform === 'buyrent' ? link.property_id : link.post_id;
  const result = await service.fetchPostAnalytics(idOrPropertyId);

  if (!result.error && result.data) {
    saveCache(link.property_id, link.platform, result.data);
    result.stale = false;
  } else if (cacheRow) {
    result.stale = true;
    result.error = false;
    result.data = {
      platform: link.platform,
      impressions: cacheRow.impressions,
      likes: cacheRow.likes,
      comments: cacheRow.comments,
      shares: cacheRow.shares,
      clicks: cacheRow.clicks,
      reach: cacheRow.reach,
    };
  }

  return result;
}

// GET /api/analytics/property/:id
router.get('/property/:id', async (req, res) => {
  const { id } = req.params;
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

  const links = db
    .prepare('SELECT * FROM platform_links WHERE property_id = ?')
    .all(id);

  const byPlatform = {};
  for (const link of links) {
    if (!byPlatform[link.platform]) {
      const result = await fetchForLink(link);
      byPlatform[link.platform] = result;
    }
  }

  // Platforms with no links get zeros
  const allPlatforms = ['facebook', 'instagram', 'tiktok', 'twitter', 'buyrent'];
  for (const p of allPlatforms) {
    if (!byPlatform[p]) {
      byPlatform[p] = { error: false, stale: false, data: { platform: p, impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 } };
    }
  }

  const totals = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
  for (const entry of Object.values(byPlatform)) {
    if (entry.data) {
      totals.impressions += entry.data.impressions || 0;
      totals.reach += entry.data.reach || 0;
      totals.likes += entry.data.likes || 0;
      totals.comments += entry.data.comments || 0;
      totals.shares += entry.data.shares || 0;
      totals.clicks += entry.data.clicks || 0;
    }
  }

  res.json({ success: true, data: { property, byPlatform, totals } });
});

// GET /api/analytics/overview — aggregate all properties
router.get('/overview', async (req, res) => {
  const properties = db.prepare('SELECT * FROM properties').all();
  const platformTotals = { facebook: {}, instagram: {}, tiktok: {}, twitter: {}, buyrent: {} };
  const propertyStats = [];

  for (const property of properties) {
    const links = db.prepare('SELECT * FROM platform_links WHERE property_id = ?').all(property.id);
    const byPlatform = {};

    for (const link of links) {
      if (!byPlatform[link.platform]) {
        const result = await fetchForLink(link);
        byPlatform[link.platform] = result;
      }
    }

    const totals = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
    for (const [platform, entry] of Object.entries(byPlatform)) {
      if (entry.data) {
        const d = entry.data;
        totals.impressions += d.impressions || 0;
        totals.reach += d.reach || 0;
        totals.likes += d.likes || 0;
        totals.comments += d.comments || 0;
        totals.shares += d.shares || 0;
        totals.clicks += d.clicks || 0;

        if (!platformTotals[platform].reach) platformTotals[platform] = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
        platformTotals[platform].impressions += d.impressions || 0;
        platformTotals[platform].reach += d.reach || 0;
        platformTotals[platform].likes += d.likes || 0;
        platformTotals[platform].comments += d.comments || 0;
        platformTotals[platform].shares += d.shares || 0;
        platformTotals[platform].clicks += d.clicks || 0;
      }
    }

    propertyStats.push({ property, totals });
  }

  propertyStats.sort((a, b) => b.totals.reach - a.totals.reach);

  res.json({ success: true, data: { platformTotals, propertyStats } });
});

// POST /api/analytics/refresh-all
router.post('/refresh-all', async (req, res) => {
  const links = db.prepare('SELECT * FROM platform_links').all();
  const results = [];
  for (const link of links) {
    const service = services[link.platform];
    if (!service) continue;
    const idOrPropertyId = link.platform === 'buyrent' ? link.property_id : link.post_id;
    const result = await service.fetchPostAnalytics(idOrPropertyId);
    if (!result.error && result.data) {
      saveCache(link.property_id, link.platform, result.data);
    }
    results.push({ linkId: link.id, platform: link.platform, error: result.error });
  }
  res.json({ success: true, data: results });
});

// GET /api/platforms/status
router.get('/platforms/status', (req, res) => {
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

module.exports = router;
