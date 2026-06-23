const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db');
const { saveManualStats } = require('../services/buyrent');

function extractPostId(platform, url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/, '').split('/');
    const last = parts[parts.length - 1];
    switch (platform) {
      case 'facebook':
        if (u.searchParams.get('story_fbid')) return u.searchParams.get('story_fbid');
        return last;
      case 'instagram':
        if (parts.includes('p')) return parts[parts.indexOf('p') + 1];
        return last;
      case 'tiktok':
        if (parts.includes('video')) return parts[parts.indexOf('video') + 1];
        return last;
      case 'twitter':
        if (parts.includes('status')) return parts[parts.indexOf('status') + 1];
        return last;
      default:
        return last;
    }
  } catch {
    return url;
  }
}

router.get('/', async (req, res) => {
  try {
    const properties = await all('SELECT * FROM propiq.properties ORDER BY created_at DESC');
    const result = [];
    for (const p of properties) {
      const links = await all(
        'SELECT * FROM propiq.platform_links WHERE property_id = $1 ORDER BY linked_at DESC',
        [p.id]
      );
      result.push({ ...p, links });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await get('SELECT * FROM propiq.properties WHERE id = $1', [req.params.id]);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    const links = await all('SELECT * FROM propiq.platform_links WHERE property_id = $1', [property.id]);
    res.json({ success: true, data: { ...property, links } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, address, description } = req.body;
  if (!name || !address)
    return res.status(400).json({ success: false, error: 'name and address are required' });
  try {
    const property = await get(
      'INSERT INTO propiq.properties (name, address, description) VALUES ($1, $2, $3) RETURNING *',
      [name, address, description || null]
    );
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const property = await get('SELECT id FROM propiq.properties WHERE id = $1', [req.params.id]);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    await run('DELETE FROM propiq.properties WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/links', async (req, res) => {
  const { platform, post_url } = req.body;
  const validPlatforms = ['facebook', 'instagram', 'tiktok', 'twitter', 'buyrent'];
  if (!platform || !post_url)
    return res.status(400).json({ success: false, error: 'platform and post_url are required' });
  if (!validPlatforms.includes(platform))
    return res.status(400).json({ success: false, error: `platform must be one of: ${validPlatforms.join(', ')}` });
  try {
    const property = await get('SELECT id FROM propiq.properties WHERE id = $1', [req.params.id]);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    const post_id = extractPostId(platform, post_url);
    const link = await get(
      'INSERT INTO propiq.platform_links (property_id, platform, post_id, post_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [property.id, platform, post_id, post_url]
    );
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id/links/:linkId', async (req, res) => {
  try {
    const link = await get(
      'SELECT id FROM propiq.platform_links WHERE id = $1 AND property_id = $2',
      [req.params.linkId, req.params.id]
    );
    if (!link) return res.status(404).json({ success: false, error: 'Link not found' });
    await run('DELETE FROM propiq.platform_links WHERE id = $1', [req.params.linkId]);
    res.json({ success: true, message: 'Link removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/manual-stats', async (req, res) => {
  const validPlatforms = ['facebook', 'instagram', 'tiktok', 'twitter', 'buyrent'];
  const { platform, impressions, likes, comments, shares, clicks, reach } = req.body;
  if (!platform || !validPlatforms.includes(platform))
    return res.status(400).json({ success: false, error: `platform must be one of: ${validPlatforms.join(', ')}` });
  const propertyId = parseInt(req.params.id, 10);
  try {
    const property = await get('SELECT id FROM propiq.properties WHERE id = $1', [propertyId]);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    const imp = impressions || 0, lk = likes || 0, cm = comments || 0;
    const sh = shares || 0, cl = clicks || 0, rc = reach || 0;

    const existing = await get(
      'SELECT id FROM propiq.analytics_cache WHERE property_id = $1 AND platform = $2',
      [propertyId, platform]
    );
    if (existing) {
      await run(
        `UPDATE propiq.analytics_cache
            SET fetched_at = now(), impressions = $1, likes = $2, comments = $3,
                shares = $4, clicks = $5, reach = $6
          WHERE property_id = $7 AND platform = $8`,
        [imp, lk, cm, sh, cl, rc, propertyId, platform]
      );
    } else {
      await run(
        `INSERT INTO propiq.analytics_cache
           (property_id, platform, impressions, likes, comments, shares, clicks, reach)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [propertyId, platform, imp, lk, cm, sh, cl, rc]
      );
    }

    await run(
      `INSERT INTO propiq.analytics_history
         (property_id, platform, impressions, likes, comments, shares, clicks, reach)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [propertyId, platform, imp, lk, cm, sh, cl, rc]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/buyrent-stats', async (req, res) => {
  const { views, enquiries } = req.body;
  const propertyId = parseInt(req.params.id, 10);
  try {
    const property = await get('SELECT id FROM propiq.properties WHERE id = $1', [propertyId]);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    await saveManualStats(propertyId, views || 0, enquiries || 0);
    res.json({ success: true, message: 'Buyrent stats saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;