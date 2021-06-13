const express = require('express')
const router = express.Router()


router.get('/', (req, res) => {
    res.render('about', {
        page: 'about',
        title: 'About US Gov Regs Explorer',
        user: req.session.user || null
    })
})


module.exports = router
