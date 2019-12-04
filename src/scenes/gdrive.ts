import { BaseScene, ContextMessageUpdate } from 'telegraf'
import { __ } from '../helpers/strings'
import AppVar, { APP_VAR_KEYS } from '../models/AppVar'
import { SCENE } from '../const/sceneId'

const scene = new BaseScene<ContextMessageUpdate>(SCENE.GDRIVE_SETUP)
scene
    .enter(async (ctx) => {
        const authUrl = ctx.gdrive.getNewAuthUrl()

        await ctx.reply(__('gdrive.askForToken', { link: authUrl }))
    })
    .on('text', async (ctx) => {
        try {
            const creds = await ctx.gdrive.getCredentialsByCode(ctx.message.text)
            // @ts-ignore -- whilst there's no ts for -Async postfix :(
            await AppVar.query().insert({
                key: APP_VAR_KEYS.GDRIVE_ACCESS_TOKEN,
                value: JSON.stringify(creds)
            })

            await ctx.scene.enter('main')
        } catch (e) {
            await ctx.reply(e)
        }
    })
    .command('cancel', async (ctx) => {
        await ctx.reply(__('gdrive.warn'))
    })
export default scene
