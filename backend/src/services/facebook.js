const axios = require('axios');

/**
 * Fetch analytics for a Facebook post using the Graph API.
 * Requires FACEBOOK_PAGE_TOKEN environment variable.
 *
 * @param {string} postId - The Facebook post ID (numeric string)
 * @returns {object} Analytics data or error object
 */
async function fetchPostAnalytics(postId) {
  const token = process.env.FACEBOOK_PAGE_TOKEN;

  if (!token) {
    return {
      error: true,
      message: 'FACEBOOK_PAGE_TOKEN is not configured. Set it in your .env file.',
      data: null,
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${postId}`;
    const params = {
      fields: 'likes.summary(true),comments.summary(true),shares,impressions,reach',
      access_token: token,
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    const d = response.data;

    return {
      error: false,
      message: null,
      data: {
        platform: 'facebook',
        impressions: d.impressions || 0,
        reach: d.reach || 0,
        likes: d.likes?.summary?.total_count || 0,
        comments: d.comments?.summary?.total_count || 0,
        shares: d.shares?.count || 0,
        clicks: 0, // Not available from this endpoint without page insights
      },
    };
  } catch (err) {
    const message =
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown error fetching Facebook analytics';
    return {
      error: true,
      message: `Facebook API error: ${message}`,
      data: null,
    };
  }
}

module.exports = { fetchPostAnalytics };
