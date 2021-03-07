
const documentId = document.querySelector('.document').getAttribute('data-document-id')

const attachmentTitleLength = 45

let totalCount = 0
const commentIdSets = [[]]
let index = 0
let counter = 1
let max = 5
Array.from(document.querySelectorAll('.comment')).forEach((node) => {
    if (counter > max) {
        commentIdSets.push([])
        index++
        counter = 1
    }
    commentIdSets[index].push(node.getAttribute('data-comment-id'))
    counter++
    totalCount++
})

const forcedDelay = (3 * 1000)

if (commentIdSets.length && commentIdSets[0].length) {
    getCommentBatch(commentIdSets.shift())
    const commentTimer = setInterval(() => {
        if (commentIdSets.length) {
            getCommentBatch(commentIdSets.shift())
        } else {
            clearInterval(commentTimer)
        }
    }, forcedDelay)
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
        .filter((n) => n.querySelector('.author').innerText.toLowerCase().includes('anonymous'))
        .forEach((n) => { (e.target.checked) ? n.classList.add('is-hidden') : n.classList.remove('is-hidden') })
})
document.querySelector('#only-attachments').addEventListener('change', (e) => {
    Array.from(allCommentRows)
        .filter((n) => n.querySelector('.attachments').innerText.toLowerCase().includes('(none)'))
        .forEach((n) => { (e.target.checked) ? n.classList.add('is-hidden') : n.classList.remove('is-hidden') })
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

const progress = document.querySelector('.comments-loaded')
let totalLoaded = 0

function getCommentBatch(commentSet) {
    fetch(`/document/${documentId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comments: commentSet })

    }).then((resp) => {
        if (resp.status !== 200) {
            return console.error('Problem geting comment detail:', resp)
        }
        resp.json().then((comments) => {
            comments.forEach(updateCommentInfo)
            
            totalLoaded += comments.length
            progress.value = Math.round((totalLoaded / totalCount) * 100)
            progress.title = `${progress.value}% of comments retrieved`
            if (progress.value >= 100) {
                setTimeout(() => {
                    progress.parentNode.removeChild(progress)
                }, 3000)
            }
        })
    })
    .catch((err) => {
        return console.error('Problem geting comment detail:', err)
    })
}


function updateCommentInfo(comment) {
    const row = document.querySelector(`[data-comment-id=${comment.data.id}]`)
    if (row) {
        // Update the comment text now that we have it
        row.querySelector('.comment-text').innerText = comment.data.attributes.comment.substr(0,100) + ((comment.data.attributes.comment.length > 100) ? '...' : '')

        // Update the comment author if we have better info.
        if ((comment.data.attributes.firstName && comment.data.attributes.lastName) || comment.data.attributes.organization) {
            let author = (comment.data.attributes.firstName) ? `${comment.data.attributes.firstName} ` : ''
            author += (comment.data.attributes.lastName) ? `${comment.data.attributes.lastName}` : ''
            author += (comment.data.attributes.organization) ? `${(author.length) ? ' of ' : ''}${comment.data.attributes.organization}` : ''
            row.querySelector('.author a').innerText = author
        }

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
            attachCol.innerHTML = '(none)'
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
