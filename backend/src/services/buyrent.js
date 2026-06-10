/**
 * Buyrent (buyrent.co.za) Service
 *
 * NOTE: Buyrent does not provide a public API for analytics data. This service
 * uses manually-entered stats (views, enquiries) stored in the local database.
 * If Buyrent introduces a public API in the future, replace the DB lookup with
 * an HTTP call here.
 */

const db = require('../db');

/**
 * Fetch analytics for a Buyrent listing.
 * Falls back to manually stored data in buyrent_manual_stats table.
 *
 * @param {string|number} propertyId - The internal property ID
 * @returns {object} Analytics data or error object
 */
async function fetchPostAnalytics(propertyId) {
  try {
    const row = db
      .prepare(
        'SELECT views, enquiries, updated_at FROM buyrent_manual_stats WHERE property_id = ? ORDER BY updated_at DESC LIMIT 1'
      )
      .get(propertyId);

    if (!row) {
      return {
        error: false,
        message:
          'No Buyrent stats found. Use the manual stats endpoint to enter views and enquiries.',
        data: {
          platform: 'buyrent',
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          views: 0,
          enquiries: 0,
          manual: true,
        },
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
    return {
      error: true,
      message: `Buyrent stats error: ${err.message}`,
      data: null,
    };
  }
}

/**
 * Save or update manual Buyrent stats for a property.
 *
 * @param {number} propertyId
 * @param {number} views
 * @param {number} enquiries
 */
function saveManualStats(propertyId, views, enquiries) {
  const existing = db
    .prepare('SELECT id FROM buyrent_manual_stats WHERE property_id = ?')
    .get(propertyId);

  if (existing) {
    db.prepare(
      'UPDATE buyrent_manual_stats SET views = ?, enquiries = ?, updated_at = datetime(\'now\') WHERE property_id = ?'
    ).run(views, enquiries, propertyId);
  } else {
    db.prepare(
      'INSERT INTO buyrent_manual_stats (property_id, views, enquiries) VALUES (?, ?, ?)'
    ).run(propertyId, views, enquiries);
  }
}

module.exports = { fetchPostAnalytics, saveManualStats };
