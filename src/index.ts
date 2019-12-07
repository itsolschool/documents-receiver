import Knex from 'knex'
import { Model } from 'objection'
import attachUser from './middlewares/attachUser'

import { bot } from './helpers/bot'
import { bindRedisSession } from './helpers/redisSession'
import { setupStage } from './helpers/stage'
import { BotConfig } from 'telegraf'
import { bindGDrive } from './helpers/gdrive'
import { bindTrello } from './helpers/trello'
import * as path from 'path'
import afterStart from './helpers/afterStart'
import bindConfig from './helpers/bindConfig'
import { setupReferralMiddleware } from './middlewares/referralMiddleware'

const SECRET_WEBHOOK_PATH = process.env.WEBHOOK_PATH
const config: BotConfig = require(path.resolve(__dirname, '../config/general.json'))
const debug = require('debug')('bot')

async function setupDb() {
    const knex = Knex({
        ...require('../knexfile.js')[process.env.NODE_ENV || 'development']
    })
    Model.knex(knex)
    debug('Migration started...')
    await knex.migrate.latest()
    debug('Migration done')
}

async function setupBot() {
    bot.catch(console.log)

    bot.use(attachUser)

    bot.use(async (ctx, next) => {
        try {
            await next()
        } catch (e) {
            debugger
            console.log(e)
            throw e
        }
    })


    const gdriveSecret = JSON.parse(process.env.GDRIVE_OAUTH2_SECRET)

    bindConfig(bot, config)


    const redis = bindRedisSession(bot, process.env.REDIS_URL)
    const gdrive = await bindGDrive(bot, gdriveSecret)
    const trello = await bindTrello(bot)

    setupReferralMiddleware(bot)
    setupStage(bot)


    await bot.telegram.setWebhook(`https://itsolschool-bot-1.herokuapp.com${SECRET_WEBHOOK_PATH}`)
    bot.startWebhook(SECRET_WEBHOOK_PATH, null, +process.env.PORT)
    debug('Bot started')

    const boundServices = {
        redis,
        gdrive,
        trello,
        config
    }
    return boundServices
}

Promise.resolve()
    .then(setupDb)
    .then(setupBot)
    .then(afterStart)
    .catch(console.error)
