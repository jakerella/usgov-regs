const express = require('express')
const Docket = require('../models/Docket')

const router = express.Router()

function authCheck(req, res, next) {
    if (!req.session || !req.session.user) {
        req.session.error = 'Please log in before accessing that page!'
        return res.redirect('/')
    }
    next()
}

router.get('/', authCheck, (req, res, next) => {
    if (!req.query.docket) {
        return next(new Error('Please search for a docket to view!'))
    }
    loadDocket(req.query.docket, req, res, next)
})

router.get('/:docket', authCheck, (req, res, next) => {
    loadDocket(req.params.docket, req, res, next)
})

async function loadDocket(docketId, req, res, next) {
    let errorMsg = null
    let docket = {}
    let rules = []
    let supportingMaterialResp
    let supportingMaterials = []
    let withdrawn = []
    const user = req.session.user || null

    if (!docketId) {
        errorMsg = 'No Docket ID provided'
    } else {
        try {
            docket = (await Docket.getDocket(docketId, req.session.user.api_key)).data
        } catch(err) {
            if (err.status === 400 || err.status === 404) {
                req.session.error = err.message
                return res.redirect('/')
            } else {
                return next(err)
            }
        }

        try {
            rules = (await Docket.getDocuments(docketId, req.session.user.api_key, true, 'Rule,Proposed Rule')).data
            supportingMaterialResp = await Docket.getDocuments(docketId, req.session.user.api_key, false, 'Notice,Other,Supporting & Related Material')
            supportingMaterials = supportingMaterialResp.data
            if (user && supportingMaterialResp.rateLimitRemaining !== null) { user.rateLimitRemaining = supportingMaterialResp.rateLimitRemaining }
        } catch(err) {
            if (err.status === 400 || err.status === 404) {
                errorMsg = 'Sorry, but we had problems retrieving all of the data from regulations.gov, you may want to try again later.'
            } else {
                return next(err)
            }
        }
    }

    withdrawn = supportingMaterials.filter(d => d.attributes.withdrawn)
    supportingMaterials = supportingMaterials.filter(d => !d.attributes.withdrawn)

    res.render('docket', {
        page: 'docket',
        title: `${docketId || 'Unknown'} - US Government Rule and Regulation Explorer`,
        docket,
        rules,
        supportingMaterials,
        withdrawn,
        error: errorMsg,
        user
    })
}


module.exports = router
