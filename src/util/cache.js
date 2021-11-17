
const { promisify } = require('util')
const redis = require('redis')
const logger = require('./logger')()

const DISABLE_CACHE = process.env.DISABLE_CACHE === 'true'
if (DISABLE_CACHE) { logger.warn('CACHE DISABLED') }

let _client = null

const cacheClient = () => {
    if (_client) { return _client }
    
    if (!process.env.REDIS_URL) {
        logger.warn('WARNING: No Redis URL provided, caching will not occur.')
        return null
    }

    _client = redis.createClient(process.env.REDIS_URL)

    _client.getAsync = promisify(_client.get).bind(_client)
    _client.delAsync = promisify(_client.del).bind(_client)
    _client.setAsync = promisify(_client.set).bind(_client)
    _client.setexAsync = promisify(_client.setex).bind(_client)

    _client.on('error', function(err) {
        logger.error('ERROR from Redis: %s', err)
    })

    _client.on('ready', function() {
        logger.info('New client connection to Redis server established.')
    })

    _client.on('end', function(err) {
        logger.info('Client connection to redis server closed. %s', err)
        _client = null
    })

    return _client
}

const getCache = async (key) => {
    if (!key) { return null }

    if (DISABLE_CACHE) { return null }
    
    const cache = cacheClient()
    if (!cache) { return null }

    return JSON.parse(await cache.getAsync(key))
}

const delCache = async (key) => {
    if (!key) { return null }

    if (DISABLE_CACHE) { return null }
    
    const cache = cacheClient()
    
    if (DISABLE_CACHE) { return true }

    return JSON.parse(await cache.delAsync(key))
}

const setCache = async (key, value=null, ttl=null) => {
    if (!key) { throw new Error('No key provided for cache item') }
    
    const cache = cacheClient()
    if (!cache) { return null }

    if (DISABLE_CACHE) { return true }

    if (Number.isInteger(ttl) && ttl > 0) {
        return cache.setexAsync(key, ttl, JSON.stringify(value))
    } else {
        return cahce.setAsync(key, JSON.stringify(value))
    }
}



module.exports = {
    get: getCache,
    set: setCache,
    del: delCache
}
