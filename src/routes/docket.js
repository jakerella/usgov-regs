const express = require('express')
const Docket = require('../models/Docket')

const router = express.Router()

router.get('/', (req, res, next) => {
    loadDocket(req.query.docket, res, next)
})

router.get('/:docket', (req, res, next) => {
    loadDocket(req.params.docket, res, next)
})

async function loadDocket(docketId, res, next) {
    let errorMsg = null
    let docket = {}
    let rules = []
    let supportingMaterials = []
    let withdrawn = []

    if (!docketId) {
        errorMsg = 'No Docket ID provided'
    } else {
        try {
            docket = await Docket.getDocket(docketId)
            rules = await Docket.getDocuments(docketId, true, 'Rule,Proposed Rule')
            supportingMaterials = await Docket.getDocuments(docketId, false, 'Notice,Other,Supporting & Related Material')
        } catch(err) {
            return next(err)
        }
    }

    withdrawn = supportingMaterials.filter(d => d.attributes.withdrawn)
    supportingMaterials = supportingMaterials.filter(d => !d.attributes.withdrawn)

    res.render('docket', {
        title: `${docketId || 'Unknown'} - US Government Rule and Regulation Explorer`,
        docket,
        rules,
        supportingMaterials,
        withdrawn,
        error: errorMsg
    })
}


module.exports = router
