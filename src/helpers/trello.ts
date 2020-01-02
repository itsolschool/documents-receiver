import TrelloService from '../services/TrelloService'
import Telegraf, { ContextMessageUpdate } from 'telegraf'
import AppVar, { APP_VAR_KEYS } from '../models/AppVar'

const debug = require('debug')('bot:context:trello')

export async function bindTrello<T extends ContextMessageUpdate>(bot: Telegraf<T>, staticToken?: string) {
    var token: string

    // TODO когда-нибудь надо сделать нормальный OAuth как с GDrive сделано
    let tokenFromDB = await AppVar.query().findById(APP_VAR_KEYS.TRELLO_TOKEN)
    if (tokenFromDB?.value) {
        token = tokenFromDB?.value
        debug('Use Trello token:secret from DB')
    } else if (staticToken) {
        token = staticToken
        debug('Use static Trello token:secret')
    } else {
        throw new Error(
            `No Trello token found. Use env-var TRELLO_TOKEN_SECRET to store token:secret, ` +
                `or set it in app_var "${APP_VAR_KEYS.TRELLO_TOKEN}" db value`
        )
    }

    const service = new TrelloService(token)

    bot.use((ctx, next) => {
        ctx.trello = service
        return next()
    })

    debug('Trello attached to Context.')

    return service
}
