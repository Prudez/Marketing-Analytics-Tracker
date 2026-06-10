const axios = require('axios');

/**
 * Fetch analytics for an Instagram media post using the Instagram Graph API.
 * Requires INSTAGRAM_ACCESS_TOKEN environment variable.
 *
 * @param {string} mediaId - The Instagram media ID
 * @returns {object} Analytics data or error object
 */
async function fetchPostAnalytics(mediaId) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return {
      error: true,
      message: 'INSTAGRAM_ACCESS_TOKEN is not configured. Set it in your .env file.',
      data: null,
    };
  }

  try {
    const url = `https://graph.instagram.com/${mediaId}`;
    const params = {
      fields: 'like_count,comments_count,impressions,reach',
      access_token: token,
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    const d = response.data;

    return {
      error: false,
      message: null,
      data: {
        platform: 'instagram',
        impressions: d.impressions || 0,
        reach: d.reach || 0,
        likes: d.like_count || 0,
        comments: d.comments_count || 0,
        shares: 0,
        clicks: 0,
      },
    };
  } catch (err) {
    const message =
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown error fetching Instagram analytics';
    return {
      error: true,
      message: `Instagram API error: ${message}`,
      data: null,
    };
  }
}

module.exports = { fetchPostAnalytics };
