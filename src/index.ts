import Knex from 'knex'
import { knexSnakeCaseMappers, Model } from 'objection'
import Telegraf from 'telegraf'
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
import { BotConfig } from 'bot-config'

const config = require('config') as BotConfig
const debug = require('debug')('bot')

Sentry.init({ dsn: config.sentry.dsn })

async function setupDb() {
    const knex = Knex({
        ...config.database,
        ...knexSnakeCaseMappers()
    })
    Model.knex(knex)
    debug('Migration started...')
    await knex.migrate.latest()
    debug('Migration done')
}

async function setupBot() {
    const bot = new Telegraf(config.telegram.token)

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
        if (ctx.user) await User.query().deleteById(ctx.user.$id())
    })

    bindConfig(bot, config)

    const redis = bindSession(bot, config.redis)
    const gdrive = await bindGDrive(bot, config.gdrive.serviceAccount, config.gdrive.rootDirId)
    const trello = await bindTrello(bot, config.trello['appKey:token'])

    bot.use(sentryExtraFromCtx('session'))

    setupReferralMiddleware(bot)
    setupStage(bot)

    // Раньше можно было в HTTP Response выдать команду, вместо ещё одного запроса.
    // Теперь так делать нельзя
    bot.telegram.webhookReply = false

    if (!config.telegram.webhook) {
        await bot.telegram.deleteWebhook()
        bot.startPolling()
        debug('Bot started with Longpolling')
    } else {
        const webhook = new url.URL(config.telegram.webhook)
        await bot.telegram.setWebhook(webhook.href)
        bot.startWebhook(webhook.pathname, null, +config.server.port)
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
