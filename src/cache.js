
const { promisify } = require('util')
const redis = require('redis')

let _client = null

const cacheClient = () => {
    if (_client) { return _client }
    
    if (!process.env.REDIS_URL) {
        console.warn('WARNING: No Redis URL provided, caching will not occur.')
        return null
    }

    _client = redis.createClient(process.env.REDIS_URL)

    _client.getAsync = promisify(_client.get).bind(_client)
    _client.delAsync = promisify(_client.del).bind(_client)
    _client.setAsync = promisify(_client.set).bind(_client)
    _client.setexAsync = promisify(_client.setex).bind(_client)

    _client.on('error', function(error) {
        console.error('ERROR from Redis:', error)
    })

    _client.on('ready', function() {
        console.log('New client connection to Redis server established.')
    })

    _client.on('end', function(error) {
        console.log('Client connection to redis server closed.')
        _client = null
    })

    return _client
}

const getCache = async (key) => {
    if (!key) { return null }
    
    const cache = cacheClient()
    if (!cache) { return null }

    return JSON.parse(await cache.getAsync(key))
}

const delCache = async (key) => {
    if (!key) { return null }
    
    const cache = cacheClient()
    if (!cache) { return null }

    return JSON.parse(await cache.delAsync(key))
}

const setCache = async (key, value=null, ttl=null) => {
    if (!key) { throw new Error('No key provided for cache item') }
    
    const cache = cacheClient()
    if (!cache) { return null }

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
