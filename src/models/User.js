const { Model, DataTypes } = require('sequelize')
const uuid = require('uuid')
const crypto = require('crypto')
const sequelize = require('../db.js').getConnection()
const AppError = require('../AppError.js')


class User extends Model {
    static async register(email, pass, api_key=null) {
        const errors = []
        if (!email || !/[^@]+@[^@]+/.test(email)) {
            errors.push('Please enter a valid email address.')
        }
        if (!pass || pass.length < 9) {
            errors.push('Please enter a strong password over 8 characters long.')
        }
        if (!/[A-Za-z0-9]{40}/.test(`${api_key}`)) {
            errors.push('Please enter a valid Data.gov API key to use with this account.')
        }

        if (errors.length) {
            throw new AppError(errors.join('\n'), 400)
        }

        const user = await User.create({
            id: uuid.v4(),
            email,
            phash: crypto.createHash('sha256').update(pass + process.env.PSALT).digest('hex'),
            api_key
        })
        return { id: user.id, email: user.email, api_key: user.api_key }
    }
    static async authenticate(email, pass) {
        if (!email || !pass) {
            throw new Error('Sorry, but that is not a valid email or password.')
        }

        const user = await User.findOne({ where: { email } })

        if (!user) {
            throw new Error('Sorry, but that is not a valid email or password.')
        }

        const incoming = crypto.createHash('sha256').update(pass + process.env.PSALT).digest('hex')
        if (incoming !== user.phash) {
            throw new Error('Sorry, but that is not a valid email or password.')
        }

        return {
            id: user.id,
            email: user.email,
            api_key: user.api_key
        }
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
