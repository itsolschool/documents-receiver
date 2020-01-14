import Knex from 'knex'
import { knexSnakeCaseMappers, Model } from 'objection'
import * as path from 'path'
import Telegraf, { BotConfig } from 'telegraf'
import * as Sentry from '@sentry/node'
import { captureException, configureScope } from '@sentry/node'
import * as url from 'url'

import attachUser from './middlewares/attachUser'
import { bindSession } from './helpers/redisSession'
import { setupStage } from './helpers/stage'
import { bindGDrive } from './helpers/gdrive'
import { bindTrello } from './helpers/trello'
import afterStart from './helpers/afterStart'
import bindConfig from './helpers/bindConfig'
import { setupReferralMiddleware } from './middlewares/referralMiddleware'
import sentryExtraFromCtx from './helpers/sentryExtraFromCtx'
import User from './models/User'

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
    const bot = new Telegraf(process.env.TG_BOT_TOKEN)

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


    const gdriveServiceAccount = JSON.parse(process.env.GDRIVE_SERVICE_ACCOUNT)

    bindConfig(bot, config)

    const redis = bindSession(bot, process.env.REDIS_URL)
    const gdrive = await bindGDrive(bot, gdriveServiceAccount, config.gdrive.rootDirId)
    const trello = await bindTrello(bot, process.env.TRELLO_TOKEN_SECRET)

    bot.use(sentryExtraFromCtx('session'))

    setupReferralMiddleware(bot)
    setupStage(bot)

    // Раньше можно было в HTTP Response выдать команду, вместо ещё одного запроса.
    // Теперь так делать нельзя
    bot.telegram.webhookReply = false

    if (!process.env.WEBHOOK_URL) {
        await bot.telegram.deleteWebhook()
        bot.startPolling()
        debug('Bot started with Longpolling')
    } else {
        const webhook = new url.URL(process.env.WEBHOOK_URL)
        await bot.telegram.setWebhook(webhook.href)
        bot.startWebhook(webhook.pathname, null, +process.env.PORT)
        debug('Bot started with WebHook on ' + webhook.href)
    }

    const boundServices = {
        redis,
        gdrive,
        trello,
        config,
        bot
    }
    return boundServices
}

Promise.resolve()
    .then(setupDb)
    .then(setupBot)
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .then(afterStart)
