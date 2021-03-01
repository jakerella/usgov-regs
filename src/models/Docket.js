
const fetch = require('node-fetch')
const mockCommentData = require('../test-data/comment.json')

const cache = {}

console.log('Docket model using mocks?', process.env.NODE_ENV === 'development' && process.env.USE_MOCK === 'true');

function addToCache(id, item, ttl=86400000) {
    if (cache[id]) { delete cache[id] }
    if (process.env.NODE_ENV === 'development') { console.log(`Adding item to cache (${id})`) }
    cache[id] = {
        item,
        expires: Date.now() + ttl
    }
}

function getFromCache(id) {
    if (!cache[id]) { return null }
    if (cache[id].expires < Date.now()) {
        delete cache[id]
        return null
    }
    if (process.env.NODE_ENV === 'development') { console.log(`Retrieved item from cache (${id})`) }
    return cache[id].item
}

const Docket = {
    getDocket: async (docketId) => {
        console.log(`Requesting docket ID ${docketId}...`)

        let data = getFromCache(docketId)
        if (data) { return data }

        const govResp = await fetch(`https://api.regulations.gov/v4/dockets/${docketId}?api_key=${process.env['API_KEY']}`)
        if (govResp.status > 299) {
            throw new Error(`Unable to retrieve docket ${docketId} from regulations.gov API (${govResp.status})`)
        }
        data = (await govResp.json()).data
        addToCache(docketId, data)
        return data
    },
    getDocument: async (documentId) => {
        console.log(`Requesting document ID ${documentId}...`)

        let data = getFromCache(documentId)
        if (data) { return data }

        const govResp = await fetch(`https://api.regulations.gov/v4/documents/${documentId}?api_key=${process.env['API_KEY']}`)
        if (govResp.status > 299) {
            throw new Error(`Unable to retrieve document ${documentId} from regulations.gov API (${govResp.status})`)
        }
        data = (await govResp.json()).data
        addToCache(documentId, data)
        return data
    },
    getDocuments: async (docketId, getCommentCount=false, docType='') => {
        console.log(`Requesting documents for docket ID ${docketId}...`)

        try {
            let data = getFromCache(`${docketId}-documents`)
            if (data) { return data }

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

            addToCache(`${docketId}-documents`, documents)
            return documents

        } catch(err) {
            console.error(err)
            throw new Error(`Unable to retrieve documents for docket ${docketId} from regulations.gov API (${err.status})`)
        }
    },
    getComments: async (objectId) => {
        console.log(`Requesting comments for object ID ${objectId}...`)

        try {
            let data = getFromCache(`${objectId}-comments`)
            if (data) { return data }

            const comments = await pagedRequest(`https://api.regulations.gov/v4/comments?filter[commentOnId]=${objectId}&sort=postedDate`)
            
            addToCache(`${objectId}-comments`, comments)
            return comments

        } catch(err) {
            console.error(err)
            throw new Error(`Unable to retrieve comments for document ${objectId} from regulations.gov API (${err.status})`)
        }
    },
    getCommentDetail: async (commentIds) => {
        console.log(`Retrieving all comment detail: ${commentIds}...`)

        try {
            const comments = []
            for (let i=0; i<commentIds.length; ++i) {

                let data = getFromCache(commentIds[i])
                if (data) {
                    comments.push(data)
                    continue
                }
                
                if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK === 'true') {
                    console.log(`Returning MOCK comment data for ${commentIds[i]}`)
                    const data = Object.assign({}, mockCommentData)
                    data.data = Object.assign({}, data.data, { id: commentIds[i] })
                    data.included = [Object.assign({}, data.included[0])]
                    if (Math.random() < 0.3) { delete data.included }
                    if (Math.random() < 0.2 && data.included) {
                        data.included.push({ attributes: { title: 'document', restrictReasonType: 'Copyright', fileFormats: null } })
                    }
                    if (data.included) {
                        data.data.attributes.comment = 'See attached file(s)'
                    } else {
                        data.data.attributes = Object.assign({}, data.data.attributes, { comment: 'This is my comment which is really long and completely fake, but you MUST pay attention to me because I am a tax paying citizen!' })
                    }
                    comments.push(data)
                    continue;
                }

                const govResp = await fetch(`https://api.regulations.gov/v4/comments/${commentIds[i]}?include=attachments&api_key=${process.env['API_KEY']}`)
                if (govResp.status > 299) {
                    throw new Error(`Unable to retrieve comment ${commentIds[i]} from regulations.gov API (${govResp.status})`)
                }
                
                data = await govResp.json()
                addToCache(`${commentIds[i]}`, data)
                comments.push(data)
            }

            return comments

        } catch(err) {
            console.error(err)
            throw new Error(`Unable to retrieve comment from regulations.gov API (${err.status})`)
        }
    }
}

async function pagedRequest(baseUrl) {
    const data = []
    const limit = 250
    let page = 1

    let resp = await doRequest(baseUrl, page, limit)
    data.push(...resp.data)
    while (resp.meta.hasNextPage) {
        resp = await doRequest(baseUrl, ++page, limit)
        data.push(...resp.data)
    }

    return data
}


async function doRequest(baseUrl, page, limit=25) {
    console.log('sending request to', `${baseUrl}&page[size]=${limit}&page[number]=${page}&api_key=${process.env['API_KEY']}`);
    const govResp = await fetch(`${baseUrl}&page[size]=${limit}&page[number]=${page}&api_key=${process.env['API_KEY']}`)
    if (govResp.status > 299) {
        const err = new Error(`Unable to retrieve data from regulations.gov API (${govResp.status})`)
        err.status = govResp.status
        throw err
    }
    return await govResp.json()
}


module.exports = Docket
