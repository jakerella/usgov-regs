require('dotenv').config()

const fs = require('fs')
const express = require('express')
const cache = require('./util/cache')
const redis = require('redis')
const session = require('express-session')
const logger = require('./util/logger')()

// All the routes
const home = require('./routes/home')
const about = require('./routes/about')
const dockets = require('./routes/docket')
const documents = require('./routes/document')

// env vars and other config
const PORT = process.env['PORT'] || 80


// Check our data connections
require('./util/db.js').authenticate()
    .catch((err) => {
        logger.error('Unable to establish DB connection: %s', err)
        process.exit(1)
    })
cache.get('startup-test').catch((err) => {
    logger.error('Unable to establish Redis connection: %s', err)
    process.exit(1)
})


// start it up
const app = express()

app.use(express.static('static'))
app.set('view engine', 'pug')
app.use(express.urlencoded({ extended: false }))


let RedisStore = require('connect-redis')(session)
let redisSessionClient = redis.createClient(process.env.REDIS_URL)
redisSessionClient.on('error', (err) => {
    logger.error('ERROR using Redis session client: %s', err)
    if (/ECONNREFUSED/.test(err.message)) {
        logger.error('Unable to establish redis connection for session store, closing server')
        process.exit(1)
    }
})

const sessionOptions = {
    secret: process.env.SESS_SECRET,
    store: new RedisStore({ client: redisSessionClient }),
    resave: false,
    cookie: { maxAge: 86400000 * 60 },
    name: 'us-gov-regs',
    saveUninitialized: false
}

if (process.env.NODE_ENV !== 'development') {
    app.set('trust proxy', 1)
    sessionOptions.cookie.secure = true
}
app.use(session(sessionOptions))
logger.info('Added session options with Redis store')


app.use((req, res, next) => {
    if (/herokuapp/.test(req.header('host'))) {
        return res.redirect(301, `https://www.fedgovregs.org${req.originalUrl}`)
    }
    if (process.env.NODE_ENV !== 'development' && !req.secure) {
        return res.redirect(301, `https://${req.hostname}${req.originalUrl}`)
    }
    next()
})

app.use('/', home)
app.use('/about', about)
app.use('/docket', dockets)
app.use('/document', documents)

app.use((req, res, next) => {
    const err = new Error('Sorry, but I could not find that page.')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => {
    if (!err.status || err.status > 499) {
        logger.error(err)
    }
    
    res.status(err.status || 500)
    res.render('error', {
        title: 'US Government Rule and Regulation Explorer - Error',
        message: (err.status === 500) ? 'Sorry, we ran into a problem.' : err.message
    })
})


let server = app
if (process.env.NODE_ENV === 'development') {
    const key = fs.readFileSync('./localcert/localhost.decrypted.key')
    const cert = fs.readFileSync('./localcert/localhost.crt')

    const https = require('https')
    server = https.createServer({ key, cert }, app)
}


// here we go...
server.listen(PORT, () => {
    logger.info(`US Rule & Reg Explorer app listening at https://localhost:%s`, PORT)
})
