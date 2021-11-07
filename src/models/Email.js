/**
 * A simple class for sending email to users. Note that you MUST provide an email recipient
 * and EITHER text-based or html-based content for the email body. You can also send BOTH
 * types of content to provide the user with either based on their email preferences.
 * 
 * Basic Example:
 *   Email.send('email@domain.com', 'Test subject 1', 'Header\n\nMy email content', '<h1>Header</h1><p>My email content</p>')
 * 
 * You can also send to multiple addresses:
 *   Email.send(['email1', 'email2', ...], 'Subject', 'Email content')
 * 
 * NOTE: ALL subjects will be prefaced with "[FedGovRegs] " to ensure they can be identified 
 * and filtered by the recipients or other systems.
 */


const mailgun = new (require('mailgun.js'))(require('form-data'))

let mailgunClient = null
let MAILGUN_DOMAIN = null

if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN

    try {
        mailgunClient = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY })
    } catch(err) {
        mailgunClient = null
        console.warn(`Unable to create Mailgun client: ${err.message}`)
        if (process.env.NODE_ENV === 'development') {
            console.warn(err)
        }
    }
} else {
    console.warn('No Mailgun API key or domain present, emails will not be sent.')
}


const Email = {

    send: async (recipients, subject='New Message from FedGovRegs', textContent='', htmlContent='') => {
        if (!mailgunClient) { return false }

        if (!textContent && !htmlContent) {
            console.warn(`Empty email body provided, will not send. Subject: ${subject}`)
            return false
        }

        try {
            const mgMessage = await mailgunClient.messages.create(MAILGUN_DOMAIN, {
                from: 'FedGovRegs Automaton <no-reply@fedgovregs.org>',
                to: Array.isArray(recipients) ? recipients : [recipients],
                subject: `[FedGovRegs] ${subject}`,
                html: htmlContent || null,
                text: textContent || null
            })
            
            console.debug(`Sent email to <${recipients}> with subject "${subject}" (ID: ${mgMessage.id})`)
            return true

        } catch(err) {
            console.warn(`Unable to send message to <${recipients}> with subject "${subject}": ${err.message}`)
            if (process.env.NODE_ENV === 'development') {
                console.warn(err)
            }
            return false
        }
        

        // OLD WAY WITH HTTP API

        // const mailGunUrl = `https://api.mailgun.net/v3/${API_DOMAIN}/messages`

        // if (!/[^@]+@[^@]+/.test(recipient)) {
        //     console.warn(`Invalid recipient for email: ${recipient}`)
        //     return false
        // }
        
        // var emailContents = [
        //     `from=${encodeURIComponent('FedGovRegs Automaton <no-reply@fedgovregs.org>')}`,
        //     `to=${encodeURIComponent(recipient)}`,
        //     `subject=${encodeURIComponent('[FedGovRegs] ' + subject)}`,
        //     `text=${encodeURIComponent(content)}`
        // ]

        // const mailGunResp = await fetch(mailGunUrl, {
        //     method: 'post',
        //     headers: {
        //         'Authorization': `Basic ${Buffer.from('api:' + API_KEY).toString('base64')}`,
        //         'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        //     },
        //     body: emailContents.join('&')
        // })

        // if (mailGunResp.status > 299) {
        //     console.warn(`Bad response from Mailgun: ${mailGunResp.status}`, await mailGunResp.text())
        //     return false
        // }

        // const mailGunInfo = mailGunResp.json()

        // console.debug(`Sent email to <${recipient}> with subject "${subject}" (ID: ${'id'})`)
        // return true
    }

}

module.exports = Email
