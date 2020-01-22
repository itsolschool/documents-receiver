import TrelloService from '../services/TrelloService'
import Telegraf, { ContextMessageUpdate } from 'telegraf'

const debug = require('debug')('bot:context:trello')

export async function bindTrello<T extends ContextMessageUpdate>(bot: Telegraf<T>, staticCreds: string) {
    const service = new TrelloService(staticCreds)

    bot.use((ctx, next) => {
        ctx.trello = service
        return next()
    })

    debug('Trello attached to Context.')

    return service
}
