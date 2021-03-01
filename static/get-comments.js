
const documentId = document.querySelector('.document').getAttribute('data-document-id')

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
            comments.forEach(updateComment)
        })
    })
    .catch((err) => {
        return console.error('Problem geting comment detail:', err)
    })
}


function updateComment(comment) {
    const row = document.querySelector(`[data-comment-id=${comment.data.id}]`)
    if (row) {
        row.querySelector('.comment-text').innerText = comment.data.attributes.comment.substr(0,100) + ((comment.data.attributes.comment.length > 100) ? '...' : '')
        const attachCol = row.querySelector('.attachments')
        if (comment.included && comment.included.length) {
            attachCol.innerHTML = ''
            comment.included.forEach((attachment, i) => {
                if (!attachment.attributes.fileFormats) {
                    attachCol.innerHTML += `<a class="usa-icon--size-3" data-position="top" title="Unable to download: ${attachment.attributes.restrictReasonType}">
                        ${i+1}<svg class="usa-icon" aria-hidden="true" focusable="false" role="img">
                            <use xlink:href="/uswds/img/sprite.svg#do_not_disturb"></use>
                        </svg>
                    </a> `
                } else {
                    attachCol.innerHTML += `<a href="${attachment.attributes.fileFormats[0].fileUrl}" target="_blank" class="usa-tooltip" data-position="top" title="Download: ${attachment.attributes.title}">
                        ${i+1}<svg class="usa-icon usa-icon--size-3" aria-hidden="true" focusable="false" role="img">
                            <use xlink:href="/uswds/img/sprite.svg#file_download"></use>
                        </svg>
                    </a> `
                }
            })
        } else {
            attachCol.innerHTML = '(none)'
        }
    } else {
        console.warn('Cannot update missing comment row:', comment.data.id)
    }
}
