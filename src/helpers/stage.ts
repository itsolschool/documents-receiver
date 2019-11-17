import Telegraf, { ContextMessageUpdate, Stage } from 'telegraf';
import referral from '../scenes/referral';
import main from '../scenes/main';

export default function setupStage<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    const stage = new Stage([referral, main]);

    bot.use(stage.middleware()).command('start', async (ctx) => {
        await ctx.scene.enter('referral');
    });
}
