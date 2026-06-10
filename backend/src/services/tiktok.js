const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

/**
 * Obtain a TikTok client credentials access token.
 */
async function getAccessToken() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error('TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET must be configured.');
  }

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const response = await axios.post(
    'https://open.tiktokapis.com/v2/oauth/token/',
    new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + response.data.expires_in * 1000;
  return cachedToken;
}

/**
 * Fetch analytics for a TikTok video using the TikTok Research API.
 * Requires TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables.
 *
 * @param {string} videoId - The TikTok video ID
 * @returns {object} Analytics data or error object
 */
async function fetchPostAnalytics(videoId) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return {
      error: true,
      message: 'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are not configured. Set them in your .env file.',
      data: null,
    };
  }

  try {
    const token = await getAccessToken();

    const response = await axios.post(
      'https://open.tiktokapis.com/v2/video/query/',
      {
        filters: {
          video_ids: [videoId],
        },
        fields: [
          'id',
          'like_count',
          'comment_count',
          'share_count',
          'view_count',
          'reach',
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const videos = response.data?.data?.videos || [];
    const video = videos.find((v) => v.id === videoId) || videos[0];

    if (!video) {
      return {
        error: true,
        message: `TikTok video ${videoId} not found in API response.`,
        data: null,
      };
    }

    return {
      error: false,
      message: null,
      data: {
        platform: 'tiktok',
        impressions: video.view_count || 0,
        reach: video.reach || video.view_count || 0,
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
        clicks: 0,
      },
    };
  } catch (err) {
    const message =
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown error fetching TikTok analytics';
    return {
      error: true,
      message: `TikTok API error: ${message}`,
      data: null,
    };
  }
}

module.exports = { fetchPostAnalytics };
