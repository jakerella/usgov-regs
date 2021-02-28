const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
    res.render('home', {
        title: 'US Government Rule and Regulation Explorer',
        message: 'A little app to help navigate the rules, regulations, and comments for the US Government.'
    })
})

module.exports = router
