import { BaseScene, ContextMessageUpdate } from 'telegraf';
import { __ } from '../helpers/strings';
import { REDIS_ACCESS_TOKEN_KEY } from '../service/GDrive';

const scene = new BaseScene<ContextMessageUpdate>('gdrive');
scene
    .enter(async (ctx) => {
        const authUrl = ctx.gdrive.getNewAuthUrl();

        await ctx.reply(__('gdrive.askForToken', { link: authUrl }));
    })
    .on('text', async (ctx) => {
        try {
            const creds = await ctx.gdrive.getCredentialsByCode(ctx.message.text);
            // @ts-ignore -- whilst there's no ts for -Async postfix :(
            await ctx.redis.setAsync(REDIS_ACCESS_TOKEN_KEY, JSON.stringify(creds));

            await ctx.scene.enter('main');
        } catch (e) {
            await ctx.reply(e);
        }
    })
    .command('cancel', async (ctx) => {
        await ctx.reply(__('gdrive.warn'));
    });
export default scene;
