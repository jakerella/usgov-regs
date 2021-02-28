
const fetch = require('node-fetch')

const Docket = {
    getDocket: async (docketId) => {
        console.log(`Requesting docket ID ${docketId}...`)
        const govResp = await fetch(`https://api.regulations.gov/v4/dockets/${docketId}?api_key=${process.env['API_KEY']}`)
        if (govResp.status > 299) {
            throw new Error(`Unable to retrieve docket from regulations.gov API (${govResp.status})`)
        }
        return (await govResp.json()).data
    },
    getDocuments: async (docket) => {
        return {}
    }
}

module.exports = Docket
