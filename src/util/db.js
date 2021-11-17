const { Sequelize } = require('sequelize')
const logger = require('./logger')()

let sequelizeInstance = null
const DATABASE_URL = `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'


module.exports = {
    authenticate: async () => {
        sequelizeInstance = new Sequelize(DATABASE_URL, {
            dialectOptions: {
                ssl: {
                    rejectUnauthorized: false
                }
            }
        })
        await sequelizeInstance.authenticate()
        logger.info('Initialized DB connection and authenticated')
    },
    getConnection: () => {
        if (sequelizeInstance) { return sequelizeInstance }

        sequelizeInstance = new Sequelize(DATABASE_URL, {
            logging: (LOG_LEVEL === 'debug') ? (msg) => logger.debug(msg) : false,
            dialectOptions: {
                ssl: {
                    rejectUnauthorized: false
                }
            }
        })
        return sequelizeInstance
    }
}
