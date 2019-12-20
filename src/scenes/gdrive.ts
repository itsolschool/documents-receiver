import { ContextMessageUpdate, Extra, Markup } from 'telegraf'
import { __ } from '../helpers/strings'
import AppVar, { APP_VAR_KEYS } from '../models/AppVar'
import { SCENE } from '../const/sceneId'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'
import { CancelableScene } from '../helpers/CancelableScene'

const scene = new CancelableScene<ContextMessageUpdate>(SCENE.GDRIVE_SETUP)
scene
    .enter(async (ctx) => {
        const authUrl = ctx.gdrive.getNewAuthUrl()

        const keyboard = Markup.inlineKeyboard([Markup.urlButton('Авторизовать', authUrl)])
        await ctx.reply(__('gdrive.askForToken'), keyboard.extra())
    })
    .on('text', async (ctx) => {
        try {
            const creds = await ctx.gdrive.getCredentialsByCode(ctx.message.text)
            await AppVar.query().deleteById(APP_VAR_KEYS.GDRIVE_ACCESS_TOKEN)
            await AppVar.query().insert({
                key: APP_VAR_KEYS.GDRIVE_ACCESS_TOKEN,
                value: JSON.stringify(creds)
            })
        } catch (e) {
            await ctx.reply(`<code>${e}</code>`, Extra.HTML(true) as ExtraReplyMessage)
        } finally {
            await ctx.scene.leave()
        }
    })
    .command('cancel', async (ctx) => {
        await ctx.reply(__('gdrive.warn'))
    })
export default scene
