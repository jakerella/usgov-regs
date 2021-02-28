const express = require('express')
const Docket = require('../models/Docket')

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


module.exports = router
