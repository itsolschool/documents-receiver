import { ContextMessageUpdate, Extra, Markup } from 'telegraf'
import { __ } from '../helpers/strings'
import AppVar, { APP_VAR_KEYS } from '../models/AppVar'
import { SCENE } from '../const/sceneId'
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types'
import { CancelableScene } from '../helpers/CancelableScene'
import { transaction } from 'objection'

const scene = new CancelableScene<ContextMessageUpdate>(SCENE.GDRIVE_SETUP)
scene
    .enter(async (ctx) => {
        await ctx.reply('Простите, этот раздел в разработке')
        return ctx.scene.enter(SCENE.MAIN)

        // TODO продумать как авторизовывать приложение. Потому что при создании нового auth url старый токен убивается

        const authUrl = ctx.gdrive.getNewAuthUrl()

        const keyboard = Markup.inlineKeyboard([Markup.urlButton('Авторизовать', authUrl)])
        await ctx.reply(__('gdrive.askForToken'), keyboard.extra())
    })
    .on('text', async (ctx) => {
        try {
            const creds = await ctx.gdrive.getCredentialsByCode(ctx.message.text)
            await transaction(AppVar.knex(), async (tx) => {
                await AppVar.query(tx).deleteById(APP_VAR_KEYS.GDRIVE_ACCESS_TOKEN)
                await AppVar.query(tx).insert({
                    key: APP_VAR_KEYS.GDRIVE_ACCESS_TOKEN,
                    value: JSON.stringify(creds)
                })
            })
            await ctx.reply(__('gdrive.ok'))
            await ctx.scene.enter(SCENE.MAIN)
        } catch (e) {
            await ctx.reply(`<code>${e}</code>`, Extra.HTML(true) as ExtraReplyMessage)
            throw e
        }
    })
export default scene
