import { BaseScene, ContextMessageUpdate, Stage } from 'telegraf';
import checkUserAccess from '../helpers/checkUserAccess';

const scene = new BaseScene<ContextMessageUpdate>('main');
scene
    .enter((ctx) => {
        ctx.reply('main start');
    })
    .command('test', async (ctx) => {
        await ctx.reply('tester command ' + ctx.user?.fullName);
    })
    .command('gdrive', checkUserAccess, Stage.enter('gdrive'))
    .command('check', async (ctx) => {
        const message = await ctx.reply('🔄 GDrive checking...');
        await ctx.gdrive.checkOperational();
        await ctx.telegram.editMessageText(ctx.chat.id, message.message_id, undefined, '✅ GDrive operational');
    });
export default scene;
