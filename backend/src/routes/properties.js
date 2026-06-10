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
