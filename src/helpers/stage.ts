import Telegraf, { ContextMessageUpdate, Stage } from 'telegraf';
import referral from '../scenes/referral';
import main from '../scenes/main';
import gdrive from '../scenes/gdrive';

export function setupStage<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    const stage = new Stage([gdrive, referral, main], { default: 'main' });

    bot.use(stage.middleware());
}
