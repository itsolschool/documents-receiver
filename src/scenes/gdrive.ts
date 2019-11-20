import { BaseScene, ContextMessageUpdate } from 'telegraf';
import { __ } from '../helpers/strings';
import AppVar, { APP_GDRIVE_ACCESS_TOKEN } from '../models/AppVar';
import { GDRIVE_SETUP_SCENE, MAIN_SCENE } from '../constant/scenes';
import provideSingleton from '../ioc/provideSingletone';
import { inject } from 'inversify';
import { GDRIVE_SERVICE } from '../constant/services';
import GDriveService from '../services/GDriveService';

@provideSingleton(GDRIVE_SETUP_SCENE)
export class GDriveSetupScene extends BaseScene<ContextMessageUpdate> {
    constructor(@inject(GDRIVE_SERVICE) gdrive: GDriveService) {
        super(GDRIVE_SETUP_SCENE);

        this.enter(async (ctx) => {
            const authUrl = gdrive.getNewAuthUrl();

            await ctx.reply(__('gdrive.askForToken', { link: authUrl }));
        });

        this.on('text', async (ctx) => {
            try {
                const creds = await gdrive.getCredentialsByCode(ctx.message.text);
                // @ts-ignore -- whilst there's no ts for -Async postfix :(
                await AppVar.query().insert({
                    key: APP_GDRIVE_ACCESS_TOKEN,
                    value: JSON.stringify(creds)
                });

                await ctx.scene.enter(MAIN_SCENE);
            } catch (e) {
                await ctx.reply(e);
            }
        });
        this.command('cancel', async (ctx) => {
            await ctx.reply(__('gdrive.warn'));
        });
    }
}
