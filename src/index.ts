import Knex from 'knex'
import { knexSnakeCaseMappers, Model } from 'objection'
import * as path from 'path'
import { BotConfig } from 'telegraf'
import * as Sentry from '@sentry/node'
import { captureException, configureScope } from '@sentry/node'

import attachUser from './middlewares/attachUser'
import { bot } from './helpers/bot'
import { bindSession } from './helpers/redisSession'
import { setupStage } from './helpers/stage'
import { bindGDrive } from './helpers/gdrive'
import { bindTrello } from './helpers/trello'
import afterStart from './helpers/afterStart'
import bindConfig from './helpers/bindConfig'
import { setupReferralMiddleware } from './middlewares/referralMiddleware'
import sentryExtraFromCtx from './helpers/sentryExtraFromCtx'
import User from './models/User'
import * as url from 'url'

const config: BotConfig = require(path.resolve(__dirname, '../config/general.json'))
const debug = require('debug')('bot')

Sentry.init({ dsn: process.env.SENTRY_DSN })

async function setupDb() {
    const knex = Knex({
        ...require('../knexfile.js')[process.env.NODE_ENV || 'development'],
        ...knexSnakeCaseMappers()
    })
    Model.knex(knex)
    debug('Migration started...')
    await knex.migrate.latest()
    debug('Migration done')
}

async function setupBot() {
    bot.use(async (ctx, next) => {
        configureScope((scope) => {
            scope.setExtras({
                config: config,
                update: ctx.update
            })
        })

        try {
            await next()
        } catch (e) {
            captureException(e)
        }
    })

    bot.use(attachUser)

    // TODO удалить потом эту команду
    bot.command('skidoo', async (ctx) => {
        await ctx.reply(`Вы изгнаны из команды ${ctx.user?.team.name}`)
        if (ctx.user)
            await User.query().deleteById(ctx.user.$id())
    })


    const gdriveSecret = JSON.parse(process.env.GDRIVE_OAUTH2_SECRET)

    bindConfig(bot, config)

    const redis = bindSession(bot, process.env.REDIS_URL)
    const gdrive = await bindGDrive(bot, gdriveSecret)
    const trello = await bindTrello(bot, process.env.TRELLO_TOKEN_SECRET)

    bot.use(sentryExtraFromCtx('session'))

    setupReferralMiddleware(bot)
    setupStage(bot)

    bot.telegram.webhookReply = false

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
