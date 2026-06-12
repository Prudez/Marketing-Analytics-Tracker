const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const facebook = require('../services/facebook');
const instagram = require('../services/instagram');
const tiktok = require('../services/tiktok');
const twitter = require('../services/twitter');
const buyrent = require('../services/buyrent');

const CACHE_TTL_MS = 60 * 60 * 1000;
const services = { facebook, instagram, tiktok, twitter, buyrent };

function isCacheStale(fetchedAt) {
  if (!fetchedAt) return true;
  return Date.now() - new Date(fetchedAt).getTime() > CACHE_TTL_MS;
}

async function saveCache(db, propertyId, platform, data) {
  const existing = await db
    .prepare('SELECT id FROM analytics_cache WHERE property_id = ? AND platform = ?')
    .get(propertyId, platform);

  if (existing) {
    await db.prepare(`
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
    await db.prepare(`
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

  await db.prepare(`
    INSERT INTO analytics_history
      (property_id, platform, impressions, likes, comments, shares, clicks, reach)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    propertyId, platform,
    data.impressions || 0, data.likes || 0, data.comments || 0,
    data.shares || 0, data.clicks || 0, data.reach || 0
  );
}

async function fetchForLink(db, link) {
  const service = services[link.platform];
  if (!service) return { error: true, message: `Unknown platform: ${link.platform}`, data: null };

  const cacheRow = await db
    .prepare('SELECT * FROM analytics_cache WHERE property_id = ? AND platform = ?')
    .get(link.property_id, link.platform);

  if (cacheRow && !isCacheStale(cacheRow.fetched_at)) {
    return {
      error: false, stale: false,
      data: {
        platform: link.platform,
        impressions: cacheRow.impressions, likes: cacheRow.likes,
        comments: cacheRow.comments, shares: cacheRow.shares,
        clicks: cacheRow.clicks, reach: cacheRow.reach,
      },
    };
  }

  const idOrPropertyId = link.platform === 'buyrent' ? link.property_id : link.post_id;
  const result = await service.fetchPostAnalytics(idOrPropertyId);

  if (!result.error && result.data) {
    await saveCache(db, link.property_id, link.platform, result.data);
    result.stale = false;
  } else if (cacheRow) {
    result.stale = true;
    result.error = false;
    result.data = {
      platform: link.platform,
      impressions: cacheRow.impressions, likes: cacheRow.likes,
      comments: cacheRow.comments, shares: cacheRow.shares,
      clicks: cacheRow.clicks, reach: cacheRow.reach,
    };
  }

  return result;
}

router.get('/property/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const property = await db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    const links = await db.prepare('SELECT * FROM platform_links WHERE property_id = ?').all(id);
    const byPlatform = {};
    for (const link of links) {
      if (!byPlatform[link.platform]) {
        byPlatform[link.platform] = await fetchForLink(db, link);
      }
    }

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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const db = await getDb();
    const properties = await db.prepare('SELECT * FROM properties').all();
    const platformTotals = { facebook: {}, instagram: {}, tiktok: {}, twitter: {}, buyrent: {} };
    const propertyStats = [];

    for (const property of properties) {
      const links = await db.prepare('SELECT * FROM platform_links WHERE property_id = ?').all(property.id);
      const byPlatform = {};

      for (const link of links) {
        if (!byPlatform[link.platform]) {
          byPlatform[link.platform] = await fetchForLink(db, link);
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

          if (!platformTotals[platform].reach) {
            platformTotals[platform] = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
          }
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/refresh-all', async (req, res) => {
  try {
    const db = await getDb();
    const links = await db.prepare('SELECT * FROM platform_links').all();
    const results = [];
    for (const link of links) {
      const service = services[link.platform];
      if (!service) continue;
      const idOrPropertyId = link.platform === 'buyrent' ? link.property_id : link.post_id;
      const result = await service.fetchPostAnalytics(idOrPropertyId);
      if (!result.error && result.data) {
        await saveCache(db, link.property_id, link.platform, result.data);
      }
      results.push({ linkId: link.id, platform: link.platform, error: result.error });
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/platform/:platform', async (req, res) => {
  const { platform } = req.params;
  const validPlatforms = ['facebook', 'instagram', 'tiktok', 'twitter', 'buyrent'];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ success: false, error: 'Invalid platform' });
  }
  try {
    const db = await getDb();
    const properties = await db.prepare('SELECT * FROM properties').all();
    const result = [];

    for (const property of properties) {
      const link = await db
        .prepare('SELECT * FROM platform_links WHERE property_id = ? AND platform = ?')
        .get(property.id, platform);

      let latest = { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0 };
      if (link) {
        const fetched = await fetchForLink(db, link);
        if (fetched.data) latest = fetched.data;
      } else {
        const cacheRow = await db
          .prepare('SELECT * FROM analytics_cache WHERE property_id = ? AND platform = ?')
          .get(property.id, platform);
        if (cacheRow) {
          latest = {
            impressions: cacheRow.impressions, likes: cacheRow.likes,
            comments: cacheRow.comments, shares: cacheRow.shares,
            clicks: cacheRow.clicks, reach: cacheRow.reach,
          };
        }
      }

      const history = await db
        .prepare('SELECT recorded_at, impressions, likes, comments, shares, clicks, reach FROM analytics_history WHERE property_id = ? AND platform = ? ORDER BY recorded_at ASC')
        .all(property.id, platform);

      result.push({
        property: { id: property.id, name: property.name, address: property.address },
        latest,
        history,
      });
    }

    const totals = { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0 };
    for (const item of result) {
      totals.impressions += item.latest.impressions || 0;
      totals.likes += item.latest.likes || 0;
      totals.comments += item.latest.comments || 0;
      totals.shares += item.latest.shares || 0;
      totals.clicks += item.latest.clicks || 0;
      totals.reach += item.latest.reach || 0;
    }

    const bucketMap = {};
    for (const item of result) {
      for (const h of item.history) {
        const bucket = h.recorded_at.substring(0, 10);
        if (!bucketMap[bucket]) {
          bucketMap[bucket] = { recorded_at: bucket, impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, reach: 0 };
        }
        bucketMap[bucket].impressions += h.impressions || 0;
        bucketMap[bucket].likes += h.likes || 0;
        bucketMap[bucket].comments += h.comments || 0;
        bucketMap[bucket].shares += h.shares || 0;
        bucketMap[bucket].clicks += h.clicks || 0;
        bucketMap[bucket].reach += h.reach || 0;
      }
    }
    const history = Object.values(bucketMap).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));

    res.json({ success: true, data: { platform, properties: result, totals, history } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/platform/:platform/history', async (req, res) => {
  const { platform } = req.params;
  const validPlatforms = ['facebook', 'instagram', 'tiktok', 'twitter', 'buyrent'];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ success: false, error: 'Invalid platform' });
  }
  try {
    const db = await getDb();
    const rows = await db
      .prepare(`
        SELECT substr(recorded_at, 1, 10) as recorded_at,
          SUM(impressions) as impressions, SUM(likes) as likes,
          SUM(comments) as comments, SUM(shares) as shares,
          SUM(clicks) as clicks, SUM(reach) as reach
        FROM analytics_history
        WHERE platform = ?
        GROUP BY substr(recorded_at, 1, 10)
        ORDER BY recorded_at ASC
      `)
      .all(platform);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
