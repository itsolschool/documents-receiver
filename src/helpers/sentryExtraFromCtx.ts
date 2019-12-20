import { configureScope } from '@sentry/node'
import { ContextMessageUpdate, Middleware } from 'telegraf'

export default function(key: string): Middleware<ContextMessageUpdate> {
    return async (ctx, next) => {
        configureScope((scope) => {
            scope.setExtra(key, ctx[key])
        })
        await next()
    }
}
