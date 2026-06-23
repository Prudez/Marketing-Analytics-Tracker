const { get, run } = require('../db');

async function fetchPostAnalytics(propertyId) {
  try {
    const row = await get(
      `SELECT views, enquiries, updated_at
         FROM propiq.buyrent_manual_stats
        WHERE property_id = $1
        ORDER BY updated_at DESC
        LIMIT 1`,
      [propertyId]
    );

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
  const existing = await get(
    'SELECT id FROM propiq.buyrent_manual_stats WHERE property_id = $1',
    [propertyId]
  );
  if (existing) {
    await run(
      `UPDATE propiq.buyrent_manual_stats
          SET views = $1, enquiries = $2, updated_at = now()
        WHERE property_id = $3`,
      [views, enquiries, propertyId]
    );
  } else {
    await run(
      'INSERT INTO propiq.buyrent_manual_stats (property_id, views, enquiries) VALUES ($1, $2, $3)',
      [propertyId, views, enquiries]
    );
  }
}

module.exports = { fetchPostAnalytics, saveManualStats };