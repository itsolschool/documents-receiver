import Telegraf, { ContextMessageUpdate } from 'telegraf'
import { BotConfig } from 'bot-config'

export default (bot: Telegraf<ContextMessageUpdate>, config: BotConfig) =>
    bot.use((ctx, next) => {
        ctx.config = config
        return next()
    })
