const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
    res.render('home', {
        page: 'home',
        title: 'US Government Rule and Regulation Explorer',
        message: 'A little app to help navigate the rules, regulations, and comments for the US Government.'
    })
})

router.get('/about', (req, res) => {
    res.render('about', {
        page: 'about',
        title: 'About US Gov Regs Explorer',
        message: 'A little app to help navigate the rules, regulations, and comments for the US Government.'
    })
})

module.exports = router
