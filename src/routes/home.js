const express = require('express')
const router = express.Router()

const User = require('../models/User.js')


router.get('/', async (req, res) => {
    if (/@foo\.com$/.test(req.query.email)) {
        try {
            const userDetail = await User.register(req.query.email, 'abc123')
            console.log('NEW USER: ', userDetail)
            userDetail.user.authenticate(userDetail.password, req)
            console.log('new user logged in')
        } catch(err) {
            console.error('Unable to create new user:', err)
        }
    }

    console.log('Session User?', req.session)


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
