const documentId = document.querySelector('.document').getAttribute('data-document-id')

const attachmentTitleLength = 45
const commentRequestDelay = (3 * 1000)
const commentBatchSize = 5

const commentIds = Array.from(document.querySelectorAll('.comment')).map((node) => {
    return node.getAttribute('data-comment-id')
})
const totalCount = commentIds.length
let totalLoaded = 0

const rateLimitNode = document.querySelector('.rate-limit-count')

if (commentIds.length) {
    ;(async () => {
        let commentDetails = []
        try {
            // see if we have these cached...
            commentDetails = await loadCommentBatch(commentIds, true)
        } catch(err) {
            return displayError(err)
        }
        
        // If we don't (or we had partial caching), request the rest
        if (commentDetails.length < commentIds.length) {
            const cachedIds = commentDetails.map((comment) => comment.data.id)
            const requestIds = commentIds.filter((id) => !cachedIds.includes(id))
            console.log(`Not all comments cached, requesting ${requestIds.length} comments`)
            
            const commentTimer = setInterval(async () => {
                try {
                    if (requestIds.length) {
                        await loadCommentBatch(requestIds.splice(0, commentBatchSize))
                    } else {
                        clearInterval(commentTimer)
                    }
                } catch(err) {
                    clearInterval(commentTimer)
                    displayError(err)
                }
            }, commentRequestDelay)
        }
    })()
}

const commentTable = document.querySelector('table.comments')
const allCommentRows = commentTable.querySelectorAll('tbody tr')
commentTable.addEventListener('mouseover', (e) => {
    let tooltipTrigger = findTrigger(e.target)
    if (tooltipTrigger) {
        commentTable.querySelector('#' + tooltipTrigger.getAttribute('aria-describedby')).classList.add('is-visible')
    }
})
commentTable.addEventListener('mouseout', (e) => {
    let tooltipTrigger = findTrigger(e.target)
    if (tooltipTrigger) {
        commentTable.querySelector('#' + tooltipTrigger.getAttribute('aria-describedby')).classList.remove('is-visible')
    }
})

document.querySelector('#hide-anonymous').addEventListener('change', (e) => {
    Array.from(allCommentRows)
        .filter((n) => {
            return n.querySelector('.title').innerText.toLowerCase().includes('anonymous') || 
                n.querySelector('.author').innerText.toLowerCase().includes('anonymous')
        })
        .forEach((n) => { (e.target.checked) ? n.classList.add('is-hidden') : n.classList.remove('is-hidden') })
    
    document.querySelector('.commentCount').innerText = commentTable.querySelectorAll('.comment:not(.is-hidden)').length
})
document.querySelector('#only-attachments').addEventListener('change', (e) => {
    Array.from(allCommentRows)
        .filter((n) => n.querySelector('.attachments').innerText.toLowerCase().includes('(none)'))
        .forEach((n) => { (e.target.checked) ? n.classList.add('is-hidden') : n.classList.remove('is-hidden') })
    
    document.querySelector('.commentCount').innerText = commentTable.querySelectorAll('.comment:not(.is-hidden)').length
})


function findTrigger(node) {
    let trigger = null
    if (/usa\-tooltip/.test(node.className)) {
        trigger = node
    } else if (/usa\-tooltip/.test(node.parentNode.className)) {
        trigger = node.parentNode
    } else if (/usa\-tooltip/.test(node.parentNode.parentNode.className)) {
        trigger = node.parentNode.parentNode
    }
    return trigger
}


const progress = document.querySelector('.comments-loading')

async function loadCommentBatch(commentSet, cacheOnly=false) {
    return fetch(`/document/${documentId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments: commentSet, cacheOnly })

    }).then(async (resp) => {
        if (resp.status !== 200) {
            const respText = await resp.text()
            throw new Error(`Problem geting comment detail (${resp.status}): ${respText}`)
        }
        return resp.json()

    }).then((data) => {
        const comments = data.comments
        prepareCommentMetadata(comments)
        comments.forEach(updateCommentInfo)
        
        totalLoaded += comments.length
        progress.value = Math.round((totalLoaded / totalCount) * 100)
        progress.title = `${progress.value}% of comments retrieved`
        if (progress.value >= 100) {
            setTimeout(() => {
                progress.parentNode.removeChild(progress)
                document.querySelector('.downloadAll').classList.remove('is-hidden')
            }, 1000)
        }

        if (data.rateLimitRemaining !== null) {
            rateLimitNode.innerText = data.rateLimitRemaining
        }

        return comments
    })
}


function displayError(err) {
    console.error('Problem geting comment detail:', err)
    const errMessage = document.createElement('aside')
    errMessage.className = 'usa-alert usa-alert--error'
    errMessage.innerHTML = 
    `<div class='usa-alert__body'><p class='usa-alert__text'>
        Sorry, but there was a problem retrieving comment details. You may want to try again later.
    </p></div>`
    document.getElementById('main-content').prepend(errMessage)
}


const allComments = []
function prepareCommentMetadata(comments) {
    allComments.push(...comments.map((comment) => {
        return comment.data.attributes.objectId + ',' +
            `"${comment.data.attributes.title.replace('"', '\'')}",` +
            `"${comment.data.attributes.firstName || ''}",` +
            `"${comment.data.attributes.lastName || ''}",` +
            `"${(comment.data.attributes.organization && comment.data.attributes.organization.replace('"', '\'')) || ''}",` +
            `${comment.data.attributes.postedDate},` +
            `${comment.data.attributes.withdrawn},` +
            comment.data.relationships.attachments.data.length
    }))
}

document.querySelector('.downloadAll').addEventListener('click', (e) => {
    e.preventDefault()

    const csvContent = `data:text/csv;charset=utf-8,id,title,firstName,lastName,organization,postedDate,withdrawn,attachments\n${allComments.join('\n')}`

    const encodedUri = encodeURI(csvContent)
    const downloadLink = document.createElement('a')
    downloadLink.setAttribute('href', encodedUri)
    downloadLink.setAttribute('download', `comments__${documentId}__${(new Date()).toISOString().split('T')[0]}.csv`)
    downloadLink.classList.add('is-hidden')
    document.body.appendChild(downloadLink)
    downloadLink.click()

    return false
})


function updateCommentInfo(comment) {
    const row = document.querySelector(`[data-comment-id=${comment.data.id}]`)
    if (row) {
        // Update the comment text now that we have it
        row.querySelector('.comment-text').innerText = comment.data.attributes.comment.substr(0,100) + ((comment.data.attributes.comment.length > 100) ? '...' : '')

        let author = ''
        if (comment.data.attributes.firstName || comment.data.attributes.lastName) {
            author = [comment.data.attributes.firstName || '', comment.data.attributes.lastName || ''].join(' ')
        }
        row.querySelector('.author').innerText = author

        let org = ''
        if (comment.data.attributes.organization) {
            org = comment.data.attributes.organization
        }
        row.querySelector('.org').innerText = org

        // Update the comment attachments with download links
        const attachCol = row.querySelector('.attachments')
        if (comment.included && comment.included.length) {
            attachCol.innerHTML = ''
            const attachmentItems = []
            comment.included.forEach((attachment, i) => {
                if (!attachment.attributes.fileFormats) {
                    attachmentItems.push(
                        `<a class="usa-tooltip" data-position="top" title="" aria-describedby="tooltip-${comment.data.id}-atachment-${i}">
                            <svg class="usa-icon usa-icon--size-3" aria-hidden="true" focusable="false" role="img">
                                <use xlink:href="/uswds/img/sprite.svg#do_not_disturb"></use>
                            </svg>
                            ${attachment.attributes.title.substr(0,attachmentTitleLength)} ${((attachment.attributes.title.length > attachmentTitleLength || attachment.attributes.publication) ? '...' : '')}
                        </a>
                        <span class="usa-tooltip__body usa-tooltip__body--top" id="tooltip-${comment.data.id}-atachment-${i}" role="tooltip" aria-hidden="true">Download restricted: ${attachment.attributes.restrictReasonType}<br>${attachment.attributes.title}${(attachment.attributes.publication) ? `<br>${attachment.attributes.publication}` : ''}</span>`
                    )
                } else {
                    attachmentItems.push(
                        `<a href="${attachment.attributes.fileFormats[0].fileUrl}" target="_blank" class="usa-tooltip" data-position="top" title="" aria-describedby="tooltip-${comment.data.id}-atachment-${i}">
                            <svg class="usa-icon usa-icon--size-3" aria-hidden="true" focusable="false" role="img">
                                <use xlink:href="/uswds/img/sprite.svg#file_download"></use>
                            </svg>
                            ${attachment.attributes.title.substr(0,attachmentTitleLength)} ${((attachment.attributes.title.length > attachmentTitleLength || attachment.attributes.publication) ? '...' : '')}
                        </a>
                        <span class="usa-tooltip__body usa-tooltip__body--top" id="tooltip-${comment.data.id}-atachment-${i}" role="tooltip" aria-hidden="true">${attachment.attributes.title}${(attachment.attributes.publication) ? `<br>${attachment.attributes.publication}` : ''}</span>`
                    )
                }
            })
            attachCol.innerHTML = attachmentItems.join('<br>')
        } else {
            attachCol.innerText = '(none)'
        }

        Array.from(row.querySelectorAll('.usa-tooltip')).forEach((trigger) => {
            const triggerPos = trigger.getBoundingClientRect()
            const tip = row.querySelector('#' + trigger.getAttribute('aria-describedby'))
            tip.style.top = (trigger.offsetTop - triggerPos.height - 20) + 'px'
            tip.style.left = (trigger.offsetLeft + (triggerPos.width / 2)) + 'px'
        })

    } else {
        console.warn('Cannot update missing comment row:', comment.data.id)
    }
}

document.querySelector('.jump-to-top a').addEventListener('click', (e) => {
    e.preventDefault()
    window.scrollTo({ top: 0 })
    return false
})

