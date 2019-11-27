import Telegraf, { ContextMessageUpdate } from 'telegraf';
import TelegrafRedisSession from 'telegraf-session-redis';
import bluebird from 'bluebird';

const debug = require('debug')('bot:context:redis');

export function bindRedisSession<T extends ContextMessageUpdate>(bot: Telegraf<T>, redisUrl: string) {
    const rsession = new TelegrafRedisSession({
        // @ts-ignore -- because redis doesn't require host and port if url is specified
        store: {
            url: redisUrl
        }
    });

    const asyncRedis = bluebird.promisifyAll(rsession.client);

    bot.use(rsession.middleware()).use((ctx, next) => {
        ctx.redis = asyncRedis;
        return next();
    });

    debug('Redis started. Session attached to Context.');

    return asyncRedis;
}
