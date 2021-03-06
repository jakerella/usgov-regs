require('dotenv').config()
const express = require('express')
const { cache } = require('./data.js')

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

// start it up
const app = express()

app.use(express.static('static'))
app.set('view engine', 'pug')

app.use('/', home)
app.use('/docket', dockets)
app.use('/document', documents)

app.use((req, res, next) => {
    const err = new Error('Sorry, but I could not find that page.')
    err.status = 404
    next(err)
})

app.use((err, req, res, next) => {
    console.error(err)
    
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
