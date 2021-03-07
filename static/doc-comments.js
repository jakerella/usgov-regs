
const documentId = document.querySelector('.document').getAttribute('data-document-id')

const attachmentTitleLength = 45

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
        .filter((n) => n.querySelector('.author').innerText.toLowerCase().includes('anonymous public comment'))
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
        })
    })
    .catch((err) => {
        return console.error('Problem geting comment detail:', err)
    })
}


function updateCommentInfo(comment) {
    const row = document.querySelector(`[data-comment-id=${comment.data.id}]`)
    if (row) {
        row.querySelector('.comment-text').innerText = comment.data.attributes.comment.substr(0,100) + ((comment.data.attributes.comment.length > 100) ? '...' : '')

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
