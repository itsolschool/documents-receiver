import { ContextMessageUpdate, Middleware } from 'telegraf'
import phrases from '../helpers/strings'

const middleware: Middleware<ContextMessageUpdate> = async (ctx, next) => {
    if (ctx.user?.team.isAdmin) {
        return next()
    }

    await ctx.reply(phrases.system.accessDenied())
    await ctx.scene.leave()
}
export default middleware
