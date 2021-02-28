const express = require('express')
const Docket = require('../models/Docket')

const router = express.Router()

router.get('/', (req, res, next) => {
    loadDocket(req.query.docket, res, next)
})

async function loadDocket(docketId, res, next) {
    let errorMsg = null
    let docket = {}
    let documents = []

    if (!docketId) {
        errorMsg = 'No Docket ID provided'
    } else {
        try {
            docket = await Docket.getDocket(docketId)
            documents = await Docket.getDocuments(docketId, true, 'Rule,Proposed Rule')
        } catch(err) {
            return next(err)
        }
    }

    res.render('docket', {
        title: `${docketId || 'Unknown'} - US Government Rule and Regulation Explorer`,
        docket,
        documents,
        error: errorMsg
    })
}


module.exports = router
