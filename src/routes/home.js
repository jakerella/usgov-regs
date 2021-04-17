const express = require('express')
const router = express.Router()

const User = require('../models/User.js')


router.get('/', async (req, res) => {
    const error = req.session.error || null
    req.session.error = null

    const info = req.session.info || null
    req.session.info = null

    res.render('home', {
        page: 'home',
        title: 'US Government Rule and Regulation Explorer',
        user: req.session.user || null,
        error,
        info
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

router.get('/register', (req, res) => {
    if (req.session && req.session.user) {
        req.session.error = 'Looks like you are already logged in!'
        return res.redirect('/')
    }

    res.render('register', {
        page: 'register',
        title: 'Register - US Gov Regs Explorer',
        user: null
    })
})

router.post('/register', async (req, res) => {
    if (req.session && req.session.user) {
        req.session.error = 'Looks like you are already logged in!'
        return res.redirect('/')
    }

    let user
    try {
        user = await User.register(req.body.email, req.body.password, req.body.api_key)
    } catch(err) {
        if (err.status === 400) {
            res.render('register', {
                page: 'register',
                title: 'Register - US Gov Regs Explorer',
                user: null,
                errorMsg: err.message
            })
        } else {
            return next(err)
        }
    }

    console.log(`[${(new Date()).toISOString()}]  User registration: ${user.id} (${user.email})`);
    req.session.user = user
    req.session.info = 'Thank you for registering! You are now logged in.'
    res.redirect('/')
})

module.exports = router
