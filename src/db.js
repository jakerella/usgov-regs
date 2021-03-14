const { Sequelize } = require('sequelize')

let sequelizeInstance = null


module.exports = {
    authenticate: async () => {
        sequelizeInstance = new Sequelize(process.env.DATABASE_URL, {
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

        sequelizeInstance = new Sequelize(process.env.DATABASE_URL, {
            dialectOptions: {
                ssl: {
                    rejectUnauthorized: false
                }
            }
        })
        return sequelizeInstance
    }
}
