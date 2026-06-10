/**
 * Buyrent (buyrent.co.za) Service
 *
 * Buyrent does not provide a public API. This service uses manually-entered
 * stats (views, enquiries) stored in the local database.
 */

const { getDb } = require('../db');

async function fetchPostAnalytics(propertyId) {
  try {
    const db = await getDb();
    const row = db
      .prepare('SELECT views, enquiries, updated_at FROM buyrent_manual_stats WHERE property_id = ? ORDER BY updated_at DESC LIMIT 1')
      .get(propertyId);

    if (!row) {
      return {
        error: false,
        message: 'No Buyrent stats yet. Enter views and enquiries manually.',
        data: { platform: 'buyrent', impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, clicks: 0, views: 0, enquiries: 0, manual: true },
      };
    }

    return {
      error: false,
      message: null,
      data: {
        platform: 'buyrent',
        impressions: row.views || 0,
        reach: row.views || 0,
        likes: 0,
        comments: row.enquiries || 0,
        shares: 0,
        clicks: row.enquiries || 0,
        views: row.views || 0,
        enquiries: row.enquiries || 0,
        manual: true,
        updated_at: row.updated_at,
      },
    };
  } catch (err) {
    return { error: true, message: `Buyrent stats error: ${err.message}`, data: null };
  }
}

async function saveManualStats(propertyId, views, enquiries) {
  const db = await getDb();
  const existing = db.prepare('SELECT id FROM buyrent_manual_stats WHERE property_id = ?').get(propertyId);
  if (existing) {
    db.prepare(`UPDATE buyrent_manual_stats SET views = ?, enquiries = ?, updated_at = datetime('now') WHERE property_id = ?`)
      .run(views, enquiries, propertyId);
  } else {
    db.prepare('INSERT INTO buyrent_manual_stats (property_id, views, enquiries) VALUES (?, ?, ?)')
      .run(propertyId, views, enquiries);
  }
}

module.exports = { fetchPostAnalytics, saveManualStats };
