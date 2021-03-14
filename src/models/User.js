const { Model, DataTypes } = require('sequelize')
const uuid = require('uuid')
const crypto = require('crypto')

const sequelize = require('../db.js').getConnection()


class User extends Model {
    static async register(email, api_key=null) {
        if (!email || !/[^@]+@[^@]+/.test(email)) {
            throw new Error('Please enter a valid email address!')
        }
        const password = 'gov-regs-' + Math.ceil(Math.random() * 1000)
        const user = await User.create({
            id: uuid.v4(),
            email,
            phash: crypto.createHash('sha256').update(password + process.env.PSALT).digest('hex'),
            api_key
        })
        return { user, password }
    }
    async authenticate(pass, req) {
        const user = this
        return new Promise((resolve, reject) => {
            const incoming = crypto.createHash('sha256').update(pass + process.env.PSALT).digest('hex')
            if (incoming === user.phash) {
                req.session.regenerate((err) => {
                    if (err) {
                        console.error(err)
                        return reject(new Error('Unable to authenticate user (server error)'))
                    }
                    req.session.user = {
                        id: user.id,
                        email: user.email,
                        api_key: user.api_key
                    }
                    resolve(req.session.user)
                })
            } else {
                resolve(false)
            }
        })
    }
    async logout(req) {
        return new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) {
                    console.error(err)
                    return reject(new Error('Unable to destroy user session (server error)'))
                }
                resolve()
            })
        })
    }
}

User.init({
    id: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    phash: { type: DataTypes.STRING, allowNull: false },
    api_key: DataTypes.STRING,
    reset_token: DataTypes.STRING,
    reset_timeout: DataTypes.DATE
}, {
    sequelize,
    modelName: 'user',
    timestamps: true,
    createdAt: 'create_time',
    updatedAt: false
})

module.exports = User
