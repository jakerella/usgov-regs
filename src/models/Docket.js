
const fetch = require('node-fetch')
const cache = require('../cache.js')
const AppError = require('../AppError')
const mockCommentData = require('../test-data/comment.json')

const ONE_DAY = 86400
const ONE_MONTH = (ONE_DAY * 30)


const Docket = {
    getDocket: async (docketId, key) => {
        docketId = docketId.replace(/–/g, '-')
        console.log(`Requesting docket ID ${docketId}...`)

        let data
        try { data = await cache.get(docketId) } catch(err) { /* let it goooooo */ }
        if (data) { return data }
        
        data = (await doRequest(`/dockets/${docketId}`, key, null, null)).response.data

        try { await cache.set(docketId, data, ONE_MONTH) } catch(err) { console.error(`WARNING: unable to cache docket ${docketId}`, err.message) }

        return data
    },
    getDocument: async (documentId, key, breakCache=false) => {
        console.log(`Requesting document ID ${documentId}...`)

        let data
        if (process.env.NODE_ENV !== 'development' || !breakCache) {
            try { data = await cache.get(documentId) } catch(err) { /* let it goooooo */ }
            if (data) { return data }
        }

        data = (await doRequest(`/documents/${documentId}`, key, null, null)).response.data
        
        try { await cache.set(documentId, data, ONE_MONTH) } catch(err) { console.error(`WARNING: unable to cache document ${documentId}`, err.message) }

        return data
    },
    getDocuments: async (docketId, key, getCommentCount=false, docType=null) => {
        docketId = docketId.replace(/–/g, '-')
        console.log(`Requesting documents for docket ID ${docketId}...`)

        const path = `/documents?filter[docketId]=${docketId}&sort=postedDate${(docType) ? `&filter[documentType]=${encodeURIComponent(docType)}` : ''}`

        try {
            let data
            try { data = await cache.get(path) } catch(err) { /* let it goooooo */ }
            if (data) { return data }

            const documents = await pagedRequest(path, key)

            if (getCommentCount) {
                for (let i=0; i<documents.length; ++i) {
                    documents[i].commentCount = (await doRequest(`/comments?filter[commentOnId]=${documents[i].attributes.objectId}`, key, 1, 5)).response.meta.totalElements
                }
            }

            try { await cache.set(path, documents, ONE_DAY) } catch(err) { console.error(`WARNING: unable to cache document list for ${docketId}`, err.message) }

            return documents

        } catch(err) {
            if (!(err instanceof AppError)) { console.error(err) }
            throw new AppError(`Unable to retrieve documents for docket ${docketId}: ${err.message}`, err.status)
        }
    },
    getComments: async (objectId, key, breakCache=false) => {
        console.log(`Requesting comments for object ID ${objectId}...`)

        const path = `/comments?filter[commentOnId]=${objectId}&sort=postedDate`

        try {
            let data
            if (process.env.NODE_ENV !== 'development' || !breakCache) {
                try { data = await cache.get(path) } catch(err) { /* let it goooooo */ }
                if (data) { return data }
            }

            const comments = await pagedRequest(path, key)

            try { await cache.set(path, comments, ONE_DAY) } catch(err) { console.error(`WARNING: unable to cache comment list for ${objectId}`, err.message) }
            return comments

        } catch(err) {
            if (!(err instanceof AppError)) { console.error(err) }
            throw new AppError(`Unable to retrieve comments for document ${objectId}: ${err.message}`, err.status)
        }
    },
    getCommentDetail: async (commentIds, key, breakCache=false) => {
        console.log(`Retrieving all comment detail: ${commentIds}...`)

        try {
            const comments = []
            for (let i=0; i<commentIds.length; ++i) {

                let data
                if (process.env.NODE_ENV !== 'development' || !breakCache) {
                    try { data = await cache.get(commentIds[i]) } catch(err) { /* let it goooooo */ }
                    if (data) {
                        comments.push(data)
                        continue
                    }
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

                data = (await doRequest(`/comments/${commentIds[i]}?include=attachments`, key, null, null)).response

                try { await cache.set(commentIds[i], data, ONE_MONTH) } catch(err) { console.error(`WARNING: unable to cache comment ${commentIds[i]}`, err.message) }
                
                comments.push(data)
            }

            return comments

        } catch(err) {
            if (!(err instanceof AppError)) { console.error(err) }
            throw new AppError(`Unable to retrieve comment detail: ${err.message}`, err.status)
        }
    }
}


async function pagedRequest(path, key) {
    const data = []
    const limit = 250
    let page = 1

    let resp = (await doRequest(path, key, page, limit)).response
    data.push(...resp.data)
    while (resp.meta.hasNextPage) {
        resp = (await doRequest(path, key, ++page, limit)).response
        data.push(...resp.data)
    }

    return data
}


async function doRequest(path, key, page=1, limit=25) {
    let url = `${process.env.API_BASE}${path}`
    if (page !== null) { url = addParam(url, 'page[number]', page) }
    if (limit !== null) { url = addParam(url, 'page[size]', limit) }

    if (!key) {

    }

    if (process.env.NODE_ENV === 'development') { console.log(`sending request to ${url}`) }

    const govResp = await fetch(url, {
        headers: {
            'X-API-Key': key,
            'X-Powered-By': 'Regs-Gov-Explorer'
        }
    })
    
    if (govResp.status > 299) {
        let status = govResp.status
        let msg = `Unable to retrieve data from regulations.gov API (${govResp.status})`
        if (govResp.status === 429) {
            msg = 'Sorry, but it looks like we\'ve hit the API limit on regulations.gov. Please wait an hour and try again! (Note that cached data is still accessible!)'
        } else if (govResp.status === 404) {
            msg = 'Sorry, but it looks like regulations.gov couldn\'t find that item. Please try again!'
        } else if (govResp.status === 401 || govResp.status === 403) {
            msg = 'Sorry, but it looks like that API key is not valid. You may need to update your key!'
        } else if (govResp.status < 400) {
            console.warn(`Looks like we got a ${govResp.status} from the API`)
            status = 503
        } else {
            // For non-user errors, we just mash everything into 503 and ignore what the API returns for our users
            console.error(`Looks like we got a ${govResp.status} from the API. Full text of body:`, await govResp.text())
            status = 503
        }

        throw new AppError(msg, status)
    }
    if (process.env.NODE_ENV === 'development') {
        console.log(`Rate limit & remaining: ${govResp.headers.get('X-RateLimit-Remaining')} of ${govResp.headers.get('X-RateLimit-Limit')}`)
    }
    return {
        response: await govResp.json(),
        rateLimit: govResp.headers.get('X-RateLimit-Limit'),
        rateLimitRemaining: govResp.headers.get('X-RateLimit-Remaining'),
    }
}

function addParam(url, param, value) {
    if (/\?$/.test(url)) {
        return url += `${param}=${value}`
    } else if (/\?.+/.test(url)) {
        return url += `&${param}=${value}`
    } else {
        return url += `?${param}=${value}`
    }
}


module.exports = Docket
