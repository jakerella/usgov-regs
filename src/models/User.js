const { Model, DataTypes } = require('sequelize')
const uuid = require('uuid')
const crypto = require('crypto')
const sequelize = require('../util/db.js').getConnection()
const AppError = require('../util/AppError.js')
const Email = require('../util/Email.js')
const logger = require('../util/logger')()


class User extends Model {

    async addResetToken(ip) {
        const token = uuid.v4()
        const timeout = Date.now() + (1000 * 60 * 60 * 24)
        this.reset_token = token
        this.reset_timeout = timeout
        await this.save()

        logger.info(`Added reset token to user ID ${this.id}`)

        const resetMessage = `
            <p>
                Hello! Someone (hopefully you) has requested to reset the password on fedgovregs.org
                for the user account associated with this email address. If this was you, click on 
                the link below to reset your password.
            </p>
            <p>
                <strong>If you did not request to reset your password</strong>, then you can safely
                ignore this email. Nothing has been changed on your account and the request
                to reset has been logged to enhance your account security.
            </p>
            <p>
                <strong><a href='https://fedgovregs.org/new-password?t=${token}'>Reset My Password</a></strong>
            </p>
            <p>
                Thanks, and good luck!<br>
                <strong>&nbsp;&nbsp;The FedGovRegs Team</strong>
            </p>`

        Email.send(this.email, 'Password reset requested', null, resetMessage)
    }

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

        const welcomeMessage = `
            <p>
                Welcome to FedGovRegs! We hope that this system helps you navigate the data that 
                powers regulations.gov and makes it easier for you to do your job.
            </p>
            <p>
                This web application is 
                <strong><a href='https://github.com/jakerella/usgov-regs'>completely open source</a></strong>. 
                You can help us by submitting any bugs you find to our 
                <em><a href='https://github.com/jakerella/usgov-regs/issues'>issue tracker</a></em>. That is 
                also where you can post any questions about the site or suggestions for enhancements.
            </p>
            <p>
                Thanks, and good luck!<br>
                <strong>&nbsp;&nbsp;The FedGovRegs Team</strong>
            </p>`

        Email.send(email, 'Welcome!', null, welcomeMessage)

        return { id: user.id, email: user.email, api_key: user.api_key }
    }

    static async authenticate(email, pass) {
        const msg = 'Sorry, but that is not a valid email or password.'

        if (!email || !pass) {
            throw new AppError(msg, 400)
        }

        const user = await User.findOne({ where: { email } })

        if (!user) {
            throw new AppError(msg, 400)
        }

        const incoming = crypto.createHash('sha256').update(pass + process.env.PSALT).digest('hex')
        if (incoming !== user.phash) {
            throw new AppError(msg, 400)
        }

        return {
            id: user.id,
            email: user.email,
            api_key: user.api_key
        }
    }

    static async resetPassword(email, pass, token) {
        const auditMessage = 'Please be sure to click on the link from your email and enter your valid FedGovRegs account email address.'

        if (!email || !pass || !token) {
            throw new AppError(auditMessage, 400)
        }

        const user = await User.findOne({ where: { email } })

        if (!user || user.reset_token !== token) {
            throw new AppError(auditMessage, 400)
        }

        if (user.reset_timeout === null || Date.now() > (new Date(user.reset_timeout)).getTime()) {
            throw new AppError('Sorry, but that password reset link has expired. Please try again!', 400)
        }

        const incoming = crypto.createHash('sha256').update(pass + process.env.PSALT).digest('hex')
        user.phash = incoming
        user.reset_token = null
        user.reset_timeout = null
        
        await user.save()
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
