const express = require('express')
const Docket = require('../models/Docket')

const router = express.Router()

router.get('/', async (req, res, next) => {
    const docketId = req.query.docket
    let errorMsg = null
    let docket = {}

    if (!docketId) {
        errorMsg = 'No Docket ID provided'
    } else {
        try {
            docket = await Docket.getDocket(docketId)
            documents = await Docket.getDocuments(docket)
        } catch(err) {
            return next(err)
        }
    }

    res.render('docket', {
        title: `${docketId || 'Unknown'} - US Government Rule and Regulation Explorer`,
        docket,
        error: errorMsg
    })
})

module.exports = router
