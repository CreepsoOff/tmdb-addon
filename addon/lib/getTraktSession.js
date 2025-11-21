require('dotenv').config()
const { get, post } = require('../utils/httpClient')

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID
const TRAKT_CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET

/**
 * Get the redirect URI based on the request host or environment variable
 * @param {string} requestHost - Request host (e.g.: https://my-domain.com)
 * @returns {string} - Full redirect URI
 */
function getRedirectUri(requestHost = null) {
  // If a host was passed in the request, use it
  if (requestHost) {
    // Remove trailing slash if present
    const baseUrl = requestHost.replace(/\/$/, '')
    return `${baseUrl}/configure`
  }

  // Fallback to environment variable or default
  return process.env.TRAKT_REDIRECT_URI || `${process.env.HOST_NAME || 'http://localhost:1337'}/configure`
}

async function getTraktAuthUrl(requestHost = null) {
  if (!TRAKT_CLIENT_ID) {
    throw new Error('TRAKT_CLIENT_ID not configured')
  }

  const redirectUri = getRedirectUri(requestHost)
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  const authUrl = `https://trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  
  return { authUrl, state, redirectUri }
}

async function getTraktAccessToken(code, redirectUri = null) {
  if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
    throw new Error('TRAKT_CLIENT_ID ou TRAKT_CLIENT_SECRET não configurados')
  }

  // Use the provided redirect_uri or the default
  const finalRedirectUri = redirectUri || getRedirectUri()

  try {
    const response = await post('https://api.trakt.tv/oauth/token', {
      code,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: finalRedirectUri,
      grant_type: 'authorization_code'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return response.data || response
  } catch (err) {
    console.error('Error obtaining Trakt access token:', err)
    return { success: false, error: err.message || 'Error authenticating with Trakt' }
  }
}

async function refreshTraktAccessToken(refreshToken, redirectUri = null) {
  if (!TRAKT_CLIENT_ID || !TRAKT_CLIENT_SECRET) {
    throw new Error('TRAKT_CLIENT_ID or TRAKT_CLIENT_SECRET not configured')
  }

  // Use the provided redirect_uri or the default
  const finalRedirectUri = redirectUri || getRedirectUri()

  try {
    const response = await post('https://api.trakt.tv/oauth/token', {
      refresh_token: refreshToken,
      client_id: TRAKT_CLIENT_ID,
      client_secret: TRAKT_CLIENT_SECRET,
      redirect_uri: finalRedirectUri,
      grant_type: 'refresh_token'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return response.data || response
  } catch (err) {
    console.error('Error refreshing Trakt access token:', err)
    return { success: false, error: err.message || 'Error refreshing Trakt token' }
  }
}

module.exports = { getTraktAuthUrl, getTraktAccessToken, refreshTraktAccessToken }

