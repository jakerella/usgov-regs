
const fetch = require('node-fetch')

const Docket = {
    getDocket: async (docketId) => {
        console.log(`Requesting docket ID ${docketId}...`)
        if (process.env.NODE_ENV === 'development' && docketId === 'EPA-HQ-OPPT-2019-0080') {
            return require('../test-data/docket.json').data
        }

        const govResp = await fetch(`https://api.regulations.gov/v4/dockets/${docketId}?api_key=${process.env['API_KEY']}`)
        if (govResp.status > 299) {
            throw new Error(`Unable to retrieve docket ${docketId} from regulations.gov API (${govResp.status})`)
        }
        return (await govResp.json()).data
    },
    getDocument: async (documentId) => {
        console.log(`Requesting document ID ${documentId}...`)
        if (process.env.NODE_ENV === 'development' && documentId === 'EPA-HQ-OPPT-2019-0080-0001') {
            return require('../test-data/document.json').data
        }

        const govResp = await fetch(`https://api.regulations.gov/v4/documents/${documentId}?api_key=${process.env['API_KEY']}`)
        if (govResp.status > 299) {
            throw new Error(`Unable to retrieve document ${documentId} from regulations.gov API (${govResp.status})`)
        }
        return (await govResp.json()).data
    },
    getDocuments: async (docketId, getCommentCount=false, docType='') => {
        console.log(`Requesting documents for docket ID ${docketId}...`)

        try {
            const documents = await pagedRequest(`https://api.regulations.gov/v4/documents?filter[docketId]=${docketId}&filter[documentType]=${docType}`)
            
            if (getCommentCount) {
                for (let i=0; i<documents.length; ++i) {
                    const govResp = await fetch(`https://api.regulations.gov/v4/comments?filter[commentOnId]=${documents[i].attributes.objectId}&page[size]=5&api_key=${process.env['API_KEY']}`)
                    if (govResp.status > 299) {
                        throw new Error(`Unable to retrieve comments for document ${documents[i].attributes.objectId} from regulations.gov API (${govResp.status})`)
                    }
                    commentData = await govResp.json()
                    documents[i].commentCount = commentData.meta.totalElements
                }
            }

            return documents

        } catch(err) {
            console.error(err)
            throw new Error(`Unable to retrieve documents for docket ${docketId} from regulations.gov API (${err.status})`)
        }
    },
    getComments: async (objectId) => {
        console.log(`Requesting comments for object ID ${objectId}...`)

        const govResp = await fetch(`https://api.regulations.gov/v4/comments?filter[commentOnId]=${objectId}&api_key=${process.env['API_KEY']}`)
        if (govResp.status > 299) {
            throw new Error(`Unable to retrieve comments for object ${objectId} from regulations.gov API (${govResp.status})`)
        }
        return (await govResp.json()).data
    }
}

async function pagedRequest(baseUrl, limit=250, page=1) {
    const govResp = await fetch(`${baseUrl}&page[size]=${limit}&page[number]=${page}&api_key=${process.env['API_KEY']}`)
    if (govResp.status > 299) {
        throw new Error(`Unable to retrieve documents for docket ${docketId} from regulations.gov API (${govResp.status})`)
    }
    return (await govResp.json()).data
}

module.exports = Docket
