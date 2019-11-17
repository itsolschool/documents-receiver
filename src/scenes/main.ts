import { BaseScene, ContextMessageUpdate } from 'telegraf';

const scene = new BaseScene<ContextMessageUpdate>('main');
scene
    .enter((ctx) => {
        ctx.reply('main start');
    })
    .command('test', async (ctx) => {
        await ctx.reply('tester command ' + ctx.user?.fullName);
    });
export default scene;
