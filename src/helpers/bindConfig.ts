import Telegraf, { BotConfig, ContextMessageUpdate } from 'telegraf'

export default (bot: Telegraf<ContextMessageUpdate>, config: BotConfig) =>
    bot.use((ctx, next) => {
        ctx.config = config
        return next()
    })
