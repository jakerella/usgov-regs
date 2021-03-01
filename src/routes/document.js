const express = require('express')
const Docket = require('../models/Docket')
const jsonParser = require('body-parser').json()

const router = express.Router()

router.get('/:document', async (req, res, next) => {
    const documentId = req.params.document

    let errorMsg = null
    let document = {}
    let comments = []

    if (!documentId) {
        errorMsg = 'No Document ID provided'
    } else {
        try {
            document = await Docket.getDocument(documentId)
            comments = await Docket.getComments(document.attributes.objectId)
        } catch(err) {
            return next(err)
        }
    }

    res.render('document', {
        title: `${documentId || 'Unknown'} - US Government Rule and Regulation Explorer`,
        document,
        comments,
        error: errorMsg
    })
})

router.post('/:document/comments', jsonParser, async (req, res, next) => {
    const commentIds = req.body.comments || []

    let comments = []

    if (!Array.isArray(comments)) {
        res.status(400).json({ error: 'Please provide an array of comment IDs to retrieve' })
    } else {
        try {
            comments = await Docket.getCommentDetail(commentIds)
        } catch(err) {
            return next(err)
        }
    }

    res.json(comments)
})


module.exports = router
