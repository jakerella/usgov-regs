const config = require('dotenv')
const express = require('express')

const PORT = process.env['PORT'] || 80

const app = express()

app.use(express.static('static'))
app.set('view engine', 'pug')


app.get('/', (req, res) => {
    res.render('index', {
        title: 'US Government Rule and Regulation Explorer',
        message: 'US Government Rule and Regulation Explorer'
    })
})

app.use(function (err, req, res, next) {
    console.error(err)
    
    res.status(err.status || 500)
    res.render('error', {
        title: 'US Government Rule and Regulation Explorer - Error',
        message: (err.status === 500) ? 'Sorry, we ran into a problem.' : err.message
    })
})

app.listen(PORT, () => {
    console.log(`US Rule & Reg app listening at http://localhost:${PORT}`)
})
