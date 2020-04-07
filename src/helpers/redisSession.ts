import Telegraf, { ContextMessageUpdate, session } from 'telegraf'
import TelegrafRedisSession from 'telegraf-session-redis'
import bluebird from 'bluebird'

const debug = require('debug')('bot:context:session')

export async function bindSession<T extends ContextMessageUpdate>(bot: Telegraf<T>, redisUrl?: string) {
    if (!redisUrl) {
        bot.use(session())
        debug('InApp session started. No Redis used.')
        return
    }

    const rsession = new TelegrafRedisSession({
        // @ts-ignore -- because redis doesn't require host and port if url is specified
        store: { url: redisUrl }
    })

    const asyncRedis = bluebird.promisifyAll(rsession.client)
    bot.use(rsession.middleware())

    debug('Redis started. Session attached to Context.')

    return asyncRedis
}
