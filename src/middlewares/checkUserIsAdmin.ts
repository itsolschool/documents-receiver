import { ContextMessageUpdate, Middleware } from 'telegraf';
import { __ } from '../helpers/strings';

const middleware: Middleware<ContextMessageUpdate> = async (ctx, next) => {
    if (ctx.user?.team.isAdmin) {
        return next();
    }

    await ctx.reply(__('system.accessDenied'));
    await ctx.scene.leave();
};
export default middleware;
