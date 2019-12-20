import { ContextMessageUpdate, Middleware } from 'telegraf'
import User from '../models/User'
import { captureException, configureScope } from '@sentry/node'

const attachUser: Middleware<ContextMessageUpdate> = async (ctx, next) => {
    ctx.user = await User.query()
        .findById(ctx.from.id)
        .eager('team')

    try {
        await next()
    } catch (e) {
        configureScope((scope) => {
            scope.setUser({
                id: ctx.user.$id(),
                username: ctx.from.username
            })
            scope.setExtras({
                config: ctx.config,
                session: ctx.session,
                update: ctx.update
            })

            captureException(e)
        })
    }
}

export default attachUser