import { __ } from '../helpers/strings';
import { MAIN_SCENE } from '../constant/scenes';

export async function checkIsUserAdmin(ctx, next) {
    if (ctx.user?.team.isAdmin) {
        return next();
    }

    await ctx.reply(__('system.accessDenied'));
    await ctx.scene.enter(MAIN_SCENE);
}
