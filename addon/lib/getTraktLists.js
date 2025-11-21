require('dotenv').config()
const { get } = require('../utils/httpClient')
const { getMeta } = require('./getMeta')

async function getTraktWatchlist(type, language, page, genre, accessToken) {
  if (!accessToken) {
    throw new Error('Trakt access token not provided')
  }

  try {
    const typeParam = type === 'movie' ? 'movies' : 'shows'
    const limit = 20
    const offset = (page - 1) * limit

    const response = await get(`https://api.trakt.tv/sync/watchlist/${typeParam}?limit=${limit}&extended=full`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      }
    })

    const items = response.data || []
    const metas = []

    for (const item of items) {
      try {
        let tmdbId = null

        if (type === 'movie') {
          tmdbId = item.movie?.ids?.tmdb
        } else {
          tmdbId = item.show?.ids?.tmdb
        }

        if (tmdbId) {
          const meta = await getMeta(type, language, tmdbId)
          metas.push(meta.meta)
        }
      } catch (err) {
        console.error(`Error processing Trakt item:`, err)
      }
    }

    return { metas }
  } catch (err) {
    console.error('Error fetching Trakt watchlist:', err)
    throw err
  }
}

async function getTraktRecommendations(type, language, page, genre, accessToken) {
  if (!accessToken) {
    throw new Error('Trakt access token not provided')
  }

  try {
    const typeParam = type === 'movie' ? 'movies' : 'shows'
    const limit = 20
    const offset = (page - 1) * limit

    const response = await get(`https://api.trakt.tv/recommendations/${typeParam}?limit=${limit}&extended=full`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'trakt-api-version': '2',
        'trakt-api-key': process.env.TRAKT_CLIENT_ID
      }
    })

    const items = response.data || []
    const metas = []

    for (const item of items) {
      try {
        const tmdbId = item.ids?.tmdb

        if (tmdbId) {
          const meta = await getMeta(type, language, tmdbId)
          metas.push(meta.meta)
        }
      } catch (err) {
        console.error(`Error processing Trakt recommendation:`, err)
      }
    }

    return { metas }
  } catch (err) {
    console.error('Error fetching Trakt recommendations:', err)
    throw err
  }
}

module.exports = { getTraktWatchlist, getTraktRecommendations }

