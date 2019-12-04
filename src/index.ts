import Knex from 'knex'
import { Model } from 'objection'
import attachUser from './middlewares/attachUser'

import { bot } from './helpers/bot'
import { bindRedisSession } from './helpers/redisSession'
import { setupStage } from './helpers/stage'
import { BotConfig, Stage } from 'telegraf'
import { bindGDrive } from './helpers/gdrive'
import * as fs from 'fs'
import { bindTrello } from './helpers/trello'
import * as path from 'path'
import afterStart from './helpers/afterStart'
import bindConfig from './helpers/bindConfig'

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

    const gdriveSecret = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../config/gdrive_client_secret.json'), 'utf8')
    )

    bindConfig(bot, config)

    const redis = bindRedisSession(bot, process.env.REDIS_URL)
    const gdrive = await bindGDrive(bot, gdriveSecret)
    const trello = await bindTrello(bot)

    setupStage(bot)

    bot.command('start', Stage.enter('referral'))

    bot.catch((error) => error)

    // TODO переделать на webhook'и
    bot.startPolling()
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
