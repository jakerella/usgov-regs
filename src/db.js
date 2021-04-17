const { Sequelize } = require('sequelize')

let sequelizeInstance = null
const DATABASE_URL = `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`


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
        console.log(`Initialized DB connection and authenticated`)
    },
    getConnection: () => {
        if (sequelizeInstance) { return sequelizeInstance }

        sequelizeInstance = new Sequelize(DATABASE_URL, {
            dialectOptions: {
                ssl: {
                    rejectUnauthorized: false
                }
            }
        })
        return sequelizeInstance
    }
}
