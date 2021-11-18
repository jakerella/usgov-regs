const express = require('express')
const router = express.Router()

const User = require('../models/User')
const AppError = require('../util/AppError')
const logger = require('../util/logger')()


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
        const sessUser = await User.authenticate(req.body.email, req.body.password)
        logger.info(`User login by ${sessUser.id}`, req)
        req.session.user = sessUser
        res.redirect('/')
    } catch(err) {
        req.session.user = null
        if (err.status && err.status < 500) {
            req.session.error = err.message
            res.redirect('/')
        } else {
            next(err)
        }
    }
})

router.get('/logout', (req, res) => {
    req.session.user = null
    req.session.destroy((err) => {
        if (err) { logger.error('Problem logging user out: %s', err) }
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

router.post('/register', async (req, res, next) => {
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
                error: err.message
            })
        } else {
            let userErr = new AppError('There was a problem registering your user account.')
            if (err instanceof UniqueConstraintError) {
                userErr.status = 400
            } else {
                userErr.status = 500
            }
            return next(userErr)
        }
    }

    logger.info(`New User registration: ${user.id} (${user.email})`, req)
    req.session.user = user
    req.session.info = 'Thank you for registering! You are now logged in.'
    res.redirect('/')
})


router.get('/reset-password', (req, res) => {
    if (req.session && req.session.user) {
        req.session.error = 'Looks like you are already logged in!'
        return res.redirect('/')
    }

    res.render('reset-password', {
        page: 'reset-password',
        title: 'Reset Password - US Gov Regs Explorer',
        user: null
    })
})

router.post('/reset-password', async (req, res, next) => {
    if (req.session && req.session.user) {
        req.session.error = 'Looks like you are already logged in!'
        return res.redirect('/')
    }

    const email = req.body.email
    const user = await User.findOne({ where: { email } })

    if (user) {
        await user.addResetToken(req.ip)
    } else {
        logger.warn(`Password reset attempt for non-existent email: ${email}`, req)
    }

    req.session.user = null
    req.session.info = `Thank you, we've sent an email to allow the user to reset their password.`
    res.redirect('/')
})

router.get(['/profile', '/change-password'], (req, res) => {
    if (!req.session.user) {
        req.session.error = 'Please log in before accessing your profile page.'
        return res.redirect('/')
    }

    res.render('profile', {
        page: 'user-profile',
        title: 'User Profile - US Gov Regs Explorer',
        user: req.session.user
    })
})

router.post('/profile', async (req, res, next) => {
    if (!req.session.user) {
        req.session.error = 'Please log in before updating your profile.'
        return res.redirect('/')
    }
    if (req.session.user.id !== req.body.id) {
        return showProfileError(res, req.session.user, 'Sorry, there was a problem updating your profile. Please try again.')
    }

    let user
    try {
        user = await User.updateProfile(req.session.user.id, req.body.email, req.body.api_key)
    } catch(err) {
        return showProfileError(res, req.session.user, err.message)
    }

    logger.info(`User profile updated for: ${user.id}`, req)

    req.session.user = user
    req.session.info = 'Your profile has been updated!'
    res.redirect('/')
})

router.post('/change-password', async (req, res, next) => {
    if (!req.session.user) {
        req.session.error = 'Please log in before changing your password.'
        return res.redirect('/')
    }
    if (req.session.user.id !== req.body.id) {
        return showProfileError(res, req.session.user, 'Sorry, there was a problem changing your password. Please try again.')
    }

    try {
        await User.changePassword(req.session.user.id, req.body.current_password, req.body.new_password)
    } catch(err) {
        return showProfileError(res, req.session.user, err.message)
    }

    logger.info(`User password updated for: ${req.session.user.id}`, req)

    req.session.user = null
    req.session.info = 'Your password has been changed. Please log in again!'
    res.redirect('/')
})

function showProfileError(res, user, errorMessage) {
    res.render('profile', {
        page: 'user-profile',
        title: 'User Profile - US Gov Regs Explorer',
        user: user,
        error: errorMessage
    })
}

router.get('/new-password', (req, res) => {
    if (req.session && req.session.user) {
        req.session.error = 'Looks like you are already logged in!'
        return res.redirect('/')
    }
    if (!req.query.t) {
        req.session.error = 'Sorry, but there was no password reset token in the URL. Be sure to click on the link in your email to reset your password!'
        return res.redirect('/')
    }

    res.render('new-password', {
        page: 'new-password',
        title: 'Reset Password - US Gov Regs Explorer',
        resetToken: req.query.t.replace(/[^a-z0-9\-]/g, ''),
        user: null
    })
})

router.post('/new-password', async (req, res, next) => {
    if (req.session && req.session.user) {
        req.session.error = 'Looks like you are already logged in!'
        return res.redirect('/')
    }

    try {
        await User.resetPassword(req.body.email, req.body.password, req.body.token)
    } catch(err) {
        req.session.error = err.message
        return res.redirect('/')
    }

    logger.info(`User password was reset for account: ${req.body.email}`, req)

    req.session.user = null
    req.session.info = 'Your password has been reset! Please log in with the new password.'
    res.redirect('/')
})


module.exports = router
