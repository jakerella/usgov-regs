
const fetch = require('node-fetch')
const cache = require('../util/cache.js')
const AppError = require('../util/AppError')
const logger = require('../util/logger')()

const ONE_DAY = 86400
const ONE_MONTH = (ONE_DAY * 30)


const Docket = {
    
    getDocket: async (docketId, key) => {
        docketId = docketId.replace(/–/g, '-')
        logger.debug(`Requesting docket ID ${docketId}...`)

        let data
        try { data = await cache.get(docketId) } catch(err) { /* let it goooooo */ }
        if (data) {
            return { data, rateLimitRemaining: null }
        }
        
        const apiResp = await doRequest(`/dockets/${docketId}`, key, null, null)
        data = apiResp.response.data
        const rateLimitRemaining = apiResp.rateLimitRemaining

        try { await cache.set(docketId, data, ONE_MONTH) } catch(err) { logger.error(`WARNING: unable to cache docket ${docketId}: %s`, err) }

        return { data, rateLimitRemaining }
    },

    getDocument: async (documentId, key, breakCache=false) => {
        logger.debug(`Requesting document ID ${documentId}...`)

        let data
        if (process.env.NODE_ENV !== 'development' || !breakCache) {
            try { data = await cache.get(documentId) } catch(err) { /* let it goooooo */ }
            if (data) {
                return { data, rateLimitRemaining: null }
            }
        }

        const apiResp = await doRequest(`/documents/${documentId}`, key, null, null)
        data = apiResp.response.data
        const rateLimitRemaining = apiResp.rateLimitRemaining
        
        try { await cache.set(documentId, data, ONE_MONTH) } catch(err) { logger.error(`WARNING: unable to cache document ${documentId}: %s`, err) }

        return { data, rateLimitRemaining }
    },
    
    getDocuments: async (docketId, key, getCommentCount=false, docType=null) => {
        docketId = docketId.replace(/–/g, '-')
        logger.debug(`Requesting documents for docket ID ${docketId}...`)

        const path = `/documents?filter[docketId]=${docketId}&sort=postedDate${(docType) ? `&filter[documentType]=${encodeURIComponent(docType)}` : ''}`

        try {
            let data
            try { data = await cache.get(path) } catch(err) { /* let it goooooo */ }
            if (data) {
                return { data, rateLimitRemaining: null }
            }

            const docResponse = await pagedRequest(path, key)
            const documents = docResponse.data
            let rateLimitRemaining = docResponse.rateLimitRemaining

            if (getCommentCount) {
                for (let i=0; i<documents.length; ++i) {
                    const commentResp = await doRequest(`/comments?filter[commentOnId]=${documents[i].attributes.objectId}`, key, 1, 5)
                    documents[i].commentCount = commentResp.response.meta.totalElements
                    rateLimitRemaining = commentResp.rateLimitRemaining
                }
            }

            try { await cache.set(path, documents, ONE_DAY) } catch(err) { logger.error(`WARNING: unable to cache document list for ${docketId}: %s`, err) }

            return { data: documents, rateLimitRemaining }

        } catch(err) {
            if (!(err instanceof AppError)) { logger.error(err) }
            throw new AppError(`Unable to retrieve documents for docket ${docketId}: ${err.message}`, err.status)
        }
    },

    getComments: async (objectId, key, breakCache=false) => {
        logger.debug(`Requesting comments for object ID ${objectId}...`)

        const path = `/comments?filter[commentOnId]=${objectId}&sort=postedDate`

        try {
            let data
            if (process.env.NODE_ENV !== 'development' || !breakCache) {
                try { data = await cache.get(path) } catch(err) { /* let it goooooo */ }
                if (data) {
                    return { data, rateLimitRemaining: null }
                }
            }

            const commentResponse = await pagedRequest(path, key)
            const comments = commentResponse.data
            const rateLimitRemaining = commentResponse.rateLimitRemaining

            try { await cache.set(path, comments, ONE_DAY) } catch(err) { logger.error(`WARNING: unable to cache comment list for ${objectId}: %s`, err) }
            return { data: comments, rateLimitRemaining }

        } catch(err) {
            if (!(err instanceof AppError)) { logger.error(err) }
            throw new AppError(`Unable to retrieve comments for document ${objectId}: ${err.message}`, err.status)
        }
    },

    getCommentDetail: async (commentIds, key, breakCache=false, cacheOnly=false) => {
        logger.debug(`Retrieving all comment detail: ${commentIds}...`)
        
        if (breakCache && process.env.NODE_ENV === 'development') {
            try {
                logger.info(`Removing cache on ${commentIds.length} comments`)
                await cache.del(commentIds)
            } catch(err) {
                logger.warn('Problem removing cached comments: %s', err)
                /* let it gooooo */
            }
        }

        try {
            const comments = []
            let rateLimitRemaining = null
            for (let i=0; i<commentIds.length; ++i) {

                let data
                
                if (!breakCache) {
                    try { data = await cache.get(commentIds[i]) } catch(err) { /* let it goooooo */ }
                    if (data) {
                        logger.debug(`Used cache for comment ${commentIds[i]}`)
                        comments.push(data)
                        continue
                    }
                }

                if (cacheOnly) {
                    logger.debug('Returning only cached comment items')
                    return { data: comments, rateLimitRemaining: null }
                }

                logger.debug(`Making API request for comment ${commentIds[i]}`)
                const commentResp = await doRequest(`/comments/${commentIds[i]}?include=attachments`, key, null, null)
                data = commentResp.response
                rateLimitRemaining = commentResp.rateLimitRemaining

                try { await cache.set(commentIds[i], data, ONE_MONTH) } catch(err) { logger.error(`WARNING: unable to cache comment ${commentIds[i]}: %s`, err) }
                
                comments.push(data)
            }

            return { data: comments, rateLimitRemaining }

        } catch(err) {
            if (!(err instanceof AppError)) { logger.error(err) }
            throw new AppError(`Unable to retrieve comment detail: ${err.message}`, err.status)
        }
    }
}


async function pagedRequest(path, key) {
    const data = []
    const limit = 250
    let page = 1

    let apiResp = await doRequest(path, key, page, limit)
    // let resp = (await doRequest(path, key, page, limit)).response
    data.push(...apiResp.response.data)
    while (apiResp.response.meta.hasNextPage) {
        apiResp = await doRequest(path, key, ++page, limit)
        data.push(...apiResp.response.data)
    }
    const rateLimitRemaining = apiResp.rateLimitRemaining

    return { data, rateLimitRemaining }
}


async function doRequest(path, key, page=1, limit=25) {
    let url = `${process.env.API_BASE}${path}`
    if (page !== null) { url = addParam(url, 'page[number]', page) }
    if (limit !== null) { url = addParam(url, 'page[size]', limit) }

    logger.debug(`sending request to ${url}`)

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
            logger.warn(`Looks like we got a ${govResp.status} from the API`)
            status = 503
        } else {
            // For non-user errors, we just mash everything into 503 and ignore what the API returns for our users
            logger.error(`Looks like we got a ${govResp.status} from the API. Full text of body:`, await govResp.text())
            status = 503
        }

        throw new AppError(msg, status)
    }
    
    logger.debug(`Rate limit & remaining: ${govResp.headers.get('X-RateLimit-Remaining')} of ${govResp.headers.get('X-RateLimit-Limit')}`)
    
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
