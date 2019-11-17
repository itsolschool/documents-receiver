import { ContextMessageUpdate, Telegraf } from 'telegraf';

// Dependencies
const TelegrafBot = require('telegraf');

export const bot = new TelegrafBot(process.env.TG_BOT_TOKEN) as Telegraf<ContextMessageUpdate>;

bot.telegram.getMe().then((botInfo) => {
    const anybot = bot as any;
    anybot.options.username = botInfo.username;
});
