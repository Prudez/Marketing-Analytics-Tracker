const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
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
    const db = await getDb();
    const properties = db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all();
    const stmt = db.prepare('SELECT * FROM platform_links WHERE property_id = ? ORDER BY linked_at DESC');
    const result = properties.map((p) => ({ ...p, links: stmt.all(p.id) }));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    const links = db.prepare('SELECT * FROM platform_links WHERE property_id = ?').all(property.id);
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
    const db = await getDb();
    const info = db
      .prepare('INSERT INTO properties (name, address, description) VALUES (?, ?, ?)')
      .run(name, address, description || null);
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
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
    const db = await getDb();
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    const post_id = extractPostId(platform, post_url);
    const info = db
      .prepare('INSERT INTO platform_links (property_id, platform, post_id, post_url) VALUES (?, ?, ?, ?)')
      .run(property.id, platform, post_id, post_url);
    const link = db.prepare('SELECT * FROM platform_links WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id/links/:linkId', async (req, res) => {
  try {
    const db = await getDb();
    const link = db
      .prepare('SELECT id FROM platform_links WHERE id = ? AND property_id = ?')
      .get(req.params.linkId, req.params.id);
    if (!link) return res.status(404).json({ success: false, error: 'Link not found' });
    db.prepare('DELETE FROM platform_links WHERE id = ?').run(req.params.linkId);
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
    const db = await getDb();
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    const now = new Date().toISOString();
    const imp = impressions || 0;
    const lk = likes || 0;
    const cm = comments || 0;
    const sh = shares || 0;
    const cl = clicks || 0;
    const rc = reach || 0;
    // Upsert into analytics_cache (select-then-insert-or-update, no UNIQUE constraint)
    const existing = db.prepare('SELECT id FROM analytics_cache WHERE property_id = ? AND platform = ?').get(propertyId, platform);
    if (existing) {
      db.prepare(`
        UPDATE analytics_cache SET fetched_at=?, impressions=?, likes=?, comments=?, shares=?, clicks=?, reach=?
        WHERE property_id=? AND platform=?
      `).run(now, imp, lk, cm, sh, cl, rc, propertyId, platform);
    } else {
      db.prepare(`
        INSERT INTO analytics_cache (property_id, platform, fetched_at, impressions, likes, comments, shares, clicks, reach)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(propertyId, platform, now, imp, lk, cm, sh, cl, rc);
    }
    // Insert into analytics_history for time-series charts
    db.prepare(`
      INSERT INTO analytics_history (property_id, platform, impressions, likes, comments, shares, clicks, reach, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(propertyId, platform, imp, lk, cm, sh, cl, rc, now);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/buyrent-stats', async (req, res) => {
  const { views, enquiries } = req.body;
  const propertyId = parseInt(req.params.id, 10);
  try {
    const db = await getDb();
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    await saveManualStats(propertyId, views || 0, enquiries || 0);
    res.json({ success: true, message: 'Buyrent stats saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
