const express = require('express');
const router = express.Router();
const db = require('../db');
const { saveManualStats } = require('../services/buyrent');

/**
 * Extract a platform post ID from a URL.
 * For most platforms the numeric/alphanumeric ID is the last path segment.
 */
function extractPostId(platform, url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/, '').split('/');
    const last = parts[parts.length - 1];

    switch (platform) {
      case 'facebook':
        // e.g. https://www.facebook.com/permalink.php?story_fbid=123&id=456
        // or   https://www.facebook.com/pagename/posts/123
        if (u.searchParams.get('story_fbid')) return u.searchParams.get('story_fbid');
        return last;
      case 'instagram':
        // e.g. https://www.instagram.com/p/CaBcDeFgHiJ/
        if (parts.includes('p')) return parts[parts.indexOf('p') + 1];
        return last;
      case 'tiktok':
        // e.g. https://www.tiktok.com/@user/video/1234567890
        if (parts.includes('video')) return parts[parts.indexOf('video') + 1];
        return last;
      case 'twitter':
        // e.g. https://twitter.com/user/status/1234567890
        if (parts.includes('status')) return parts[parts.indexOf('status') + 1];
        return last;
      case 'buyrent':
        // e.g. https://www.buyrent.co.za/listing/12345
        return last;
      default:
        return last;
    }
  } catch {
    // If URL parsing fails, return the raw string as-is
    return url;
  }
}

// GET /api/properties — list all properties
router.get('/', (req, res) => {
  try {
    const properties = db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all();
    // Attach platform links to each property
    const stmt = db.prepare('SELECT * FROM platform_links WHERE property_id = ? ORDER BY linked_at DESC');
    const result = properties.map((p) => ({
      ...p,
      links: stmt.all(p.id),
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/properties/:id — get single property with links
router.get('/:id', (req, res) => {
  try {
    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    const links = db.prepare('SELECT * FROM platform_links WHERE property_id = ?').all(property.id);
    res.json({ success: true, data: { ...property, links } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/properties — create a new property
router.post('/', (req, res) => {
  const { name, address, description } = req.body;
  if (!name || !address) {
    return res.status(400).json({ success: false, error: 'name and address are required' });
  }

  try {
    const info = db
      .prepare('INSERT INTO properties (name, address, description) VALUES (?, ?, ?)')
      .run(name, address, description || null);

    const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/properties/:id — delete a property and cascade
router.delete('/:id', (req, res) => {
  try {
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    db.prepare('DELETE FROM properties WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/properties/:id/links — link a social post to a property
router.post('/:id/links', (req, res) => {
  const { platform, post_url } = req.body;
  const validPlatforms = ['facebook', 'instagram', 'tiktok', 'twitter', 'buyrent'];

  if (!platform || !post_url) {
    return res.status(400).json({ success: false, error: 'platform and post_url are required' });
  }
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ success: false, error: `platform must be one of: ${validPlatforms.join(', ')}` });
  }

  try {
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    const post_id = extractPostId(platform, post_url);

    const info = db
      .prepare(
        'INSERT INTO platform_links (property_id, platform, post_id, post_url) VALUES (?, ?, ?, ?)'
      )
      .run(property.id, platform, post_id, post_url);

    const link = db.prepare('SELECT * FROM platform_links WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/properties/:id/links/:linkId — remove a platform link
router.delete('/:id/links/:linkId', (req, res) => {
  try {
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

// POST /api/properties/:id/buyrent-stats — manually enter Buyrent stats
router.post('/:id/buyrent-stats', (req, res) => {
  const { views, enquiries } = req.body;
  const propertyId = parseInt(req.params.id, 10);

  try {
    const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });

    saveManualStats(propertyId, views || 0, enquiries || 0);
    res.json({ success: true, message: 'Buyrent stats saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
