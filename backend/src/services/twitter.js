const axios = require('axios');

/**
 * Fetch analytics for a Tweet using the Twitter v2 API.
 * Requires TWITTER_BEARER_TOKEN environment variable.
 *
 * @param {string} tweetId - The Tweet ID
 * @returns {object} Analytics data or error object
 */
async function fetchPostAnalytics(tweetId) {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    return {
      error: true,
      message: 'TWITTER_BEARER_TOKEN is not configured. Set it in your .env file.',
      data: null,
    };
  }

  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}`;
    const params = {
      'tweet.fields': 'public_metrics,non_public_metrics,organic_metrics',
    };

    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      timeout: 10000,
    });

    const tweet = response.data?.data;
    if (!tweet) {
      return {
        error: true,
        message: `Tweet ${tweetId} not found.`,
        data: null,
      };
    }

    const pub = tweet.public_metrics || {};
    const org = tweet.organic_metrics || {};
    const nonPub = tweet.non_public_metrics || {};

    return {
      error: false,
      message: null,
      data: {
        platform: 'twitter',
        impressions: pub.impression_count || org.impression_count || nonPub.impression_count || 0,
        reach: pub.impression_count || 0,
        likes: pub.like_count || 0,
        comments: pub.reply_count || 0,
        shares: pub.retweet_count || 0,
        clicks: nonPub.url_link_clicks || 0,
      },
    };
  } catch (err) {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.errors?.[0]?.message ||
      err.message ||
      'Unknown error fetching Twitter analytics';
    return {
      error: true,
      message: `Twitter API error: ${message}`,
      data: null,
    };
  }
}

module.exports = { fetchPostAnalytics };
