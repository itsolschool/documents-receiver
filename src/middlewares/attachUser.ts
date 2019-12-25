import { ContextMessageUpdate, Middleware } from 'telegraf'
import User from '../models/User'
import { configureScope } from '@sentry/node'

const attachUser: Middleware<ContextMessageUpdate> = async (ctx, next) => {
    ctx.user = await User.query()
        .findById(ctx.from.id)
        .eager('team')

    configureScope((scope) => {
        scope.setUser({
            id: ctx.from.id.toString(),
            username: ctx.from.username
        })
    })

    await next()
}

export default attachUser
