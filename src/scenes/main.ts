import { BaseScene } from 'telegraf';

const scene = new BaseScene('main');
scene
    .enter((ctx) => {
        ctx.reply('main start');
    })
    .leave((ctx) => {
        ctx.reply('main end');
    })
    .command('test', async (ctx) => {
        await ctx.reply('tester command');
        await ctx.scene.enter('help');
    });
export default scene;
