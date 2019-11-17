import Telegraf, { ContextMessageUpdate, session } from 'telegraf';

export function setupSession<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    bot.use(session<T>());
}
