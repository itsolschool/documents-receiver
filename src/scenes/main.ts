import { BaseScene, ContextMessageUpdate, Stage } from 'telegraf';
import { checkIsUserAdmin } from '../middlewares/checkUserAccess';
import { GDRIVE_SETUP_SCENE, MAIN_SCENE } from '../constant/scenes';
import { decorate, inject, injectable } from 'inversify';
import { GDRIVE_SERVICE } from '../constant/services';
import GDriveService from '../services/GDriveService';

decorate(injectable(), BaseScene);

@injectable()
export class MainScene extends BaseScene<ContextMessageUpdate> {
    constructor(@inject(GDRIVE_SERVICE) private _gdrive: GDriveService) {
        super(MAIN_SCENE);

        this.enter((ctx) => ctx.reply('main start'));

        this.command('gdrive', checkIsUserAdmin, Stage.enter(GDRIVE_SETUP_SCENE));
        this.command('check', this.checkOperationalCommand);
    }

    checkOperationalCommand = async (ctx) => {
        const message = await ctx.reply('🔄 GDrive checking...');
        try {
            await this._gdrive.checkOperational();
            await ctx.telegram.editMessageText(ctx.chat.id, message.message_id, undefined, '✅ GDrive operational');
        } catch (e) {
            await ctx.telegram.editMessageText(ctx.chat.id, message.message_id, undefined, `❌ GDrive FAILED\n${e}`);
        }
    };
}
