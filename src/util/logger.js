const { createLogger, transports } = require('winston')
const { format } = require('logform')
const { SPLAT } = require('triple-beam')
const { IncomingMessage } = require('http')

const DEFAULT_LEVEL = process.env.LOG_LEVEL || 'info'
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    log: 3,
    debug: 4
}

let logger = null

module.exports = function getLogger() {
    if (!logger) {
        logger = createAppLogger(DEFAULT_LEVEL)
    }
    return logger
}

function createAppLogger(level) {
    const logger = createLogger({
        level,
        levels,
        format: format.combine(
            format.timestamp(),
            ipExtractor(),
            format.splat(),
            logFormatter
        ),
        transports: [ new transports.Console() ],
        exceptionHandlers: [ new transports.Console() ],
        exitOnError: true
    })

    return logger
}

const ipExtractor = format((info) => {
    const request = (info[SPLAT] || []).filter((arg) => arg instanceof IncomingMessage)[0]
    if (request && request.headers) { info.ip = request.ip }
    return info;
})

const logFormatter = format.printf((info) => {
    const ts = info.timestamp.split('T')
    return `[${info.level.toUpperCase()}][${ts[0]} ${ts[1].split('.')[0]}]${(info.ip) ? `[${info.ip}]` : ''} ${info.message}`;
})
