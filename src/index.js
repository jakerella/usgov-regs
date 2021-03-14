require('dotenv').config()

const express = require('express')
const bodyParser = require('body-parser')
const cache = require('./cache.js')
const redis = require('redis')
const session = require('express-session')

// All the routes
const home = require('./routes/home')
const dockets = require('./routes/docket')
const documents = require('./routes/document')

// env vars and other config
const PORT = process.env['PORT'] || 80
const API_KEY = process.env['API_KEY']

if (!API_KEY) {
    console.error('No API key found for US Regs site')
    process.exit(1)
}

cache.get('startup-test').catch((err) => console.error('Unable to connect to Redis', err))
require('./db.js').authenticate()  // this will initialize the connection and test it
    .catch((err) => {
        console.error('Unable to establish DB connection:', err.message)
        process.exit(1)
    })


// start it up
const app = express()

app.use(express.static('static'))
app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: false }))


let RedisStore = require('connect-redis')(session)
let redisSessionClient = redis.createClient(process.env.REDIS_URL)
redisSessionClient.on('error', (err) => {
    console.error('ERROR using Redis session client:', err.message)
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


app.use('/', home)
app.use('/docket', dockets)
app.use('/document', documents)

app.use((req, res, next) => {
    const err = new Error('Sorry, but I could not find that page.')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => {
    if (!err.status || err.status > 499) {
        console.error(err)
    }
    
    res.status(err.status || 500)
    res.render('error', {
        title: 'US Government Rule and Regulation Explorer - Error',
        message: (err.status === 500) ? 'Sorry, we ran into a problem.' : err.message
    })
})

// here we go...
app.listen(PORT, () => {
    console.log(`US Rule & Reg app listening at http://localhost:${PORT}`)
    console.log(`Using API Key: ${API_KEY}`);
})
