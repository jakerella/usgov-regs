const express = require('express')
const Docket = require('../models/Docket')
const jsonParser = require('body-parser').json()

const router = express.Router()

function authCheck(req, res, next) {
    if (!req.session.user) {
        req.session.error = 'Please log in before accessing that page!'
        return res.redirect('/')
    }
    next()
}

router.get('/:document', authCheck, async (req, res, next) => {
    const documentId = req.params.document

    const breakCache = (req.query.breakcache === 'yesplease') ? true : false

    let errorMsg = null
    const user = req.session.user || null
    let document = {}
    let comments = []

    if (!documentId) {
        errorMsg = 'No Document ID provided'
    } else {
        try {
            document = (await Docket.getDocument(documentId, req.session.user.api_key, breakCache)).data
            const commentResponse = await Docket.getComments(document.attributes.objectId, req.session.user.api_key, breakCache)
            comments = commentResponse.data
            if (user && commentResponse.rateLimitRemaining !== null) { user.rateLimitRemaining = commentResponse.rateLimitRemaining }
            
        } catch(err) {
            return next(err)
        }
    }

    res.render('document', {
        page: 'document',
        title: `${documentId || 'Unknown'} - US Government Rule and Regulation Explorer`,
        document,
        comments,
        error: errorMsg,
        user
    })
})

router.post('/:document/comments', authCheck, jsonParser, async (req, res, next) => {
    const commentIds = req.body.comments || []
    const cacheOnly = (req.body.cacheOnly === true) || false
    const breakCache = (req.query.breakcache === 'yesplease') ? true : false

    let commentResponse
    let comments = []

    if (!Array.isArray(comments)) {
        res.status(400).json({ error: 'Please provide an array of comment IDs to retrieve' })
    } else {
        try {
            commentResponse = await Docket.getCommentDetail(commentIds, req.session.user.api_key, breakCache, cacheOnly)
            comments = commentResponse.data
            if (req.session.user && commentResponse.rateLimitRemaining !== null) {
                req.session.user.rateLimitRemaining = commentResponse.rateLimitRemaining
            }
        } catch(err) {
            return next(err)
        }
    }

    res.json({ comments, rateLimitRemaining: commentResponse.rateLimitRemaining })
})


module.exports = router
