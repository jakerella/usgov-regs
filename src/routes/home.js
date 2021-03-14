const express = require('express')
const router = express.Router()

const User = require('../models/User.js')


router.get('/', async (req, res) => {
    const error = req.session.error || null
    req.session.error = null
    res.render('home', {
        page: 'home',
        title: 'US Government Rule and Regulation Explorer',
        user: req.session.user || null,
        error
    })
})

router.get('/about', (req, res) => {
    res.render('about', {
        page: 'about',
        title: 'About US Gov Regs Explorer',
        user: req.session.user || null
    })
})

router.post('/login', async (req, res, next) => {
    try {
        const sessUser = await User.authenticate(req.body.email, req.body.password);
        console.log(`[${(new Date()).toISOString()}]  User login by ${sessUser.id}`);
        req.session.user = sessUser
        res.redirect('/')
    } catch(err) {
        req.session.user = null
        next(err)
    }
})

router.get('/logout', (req, res) => {
    req.session.user = null
    req.session.destroy((err) => {
        if (err) { console.error('Problem logging user out:', err) }
        res.redirect('/')
    })
})

module.exports = router
