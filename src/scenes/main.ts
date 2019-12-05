import { BaseScene, ContextMessageUpdate, Stage } from 'telegraf'
import checkUserIsAdmin from '../middlewares/checkUserIsAdmin'
import { GREEN_MARK, RED_CROSS, WHITE_QUESTION_MARK } from '../const/emojies'
import { SCENE } from '../const/sceneId'

const scene = new BaseScene<ContextMessageUpdate>(SCENE.MAIN)
scene
    .enter((ctx) => {
        ctx.reply('main start')
    })
    .command('test', async (ctx) => {
        await ctx.reply('tester command ' + ctx.user?.fullName)
    })
    .command('upload', Stage.enter(SCENE.UPLOAD_DOCUMENT))
    .command('gdrive', checkUserIsAdmin, Stage.enter(SCENE.GDRIVE_SETUP))
    .command('addTeam', checkUserIsAdmin, Stage.enter(SCENE.TEAM_ADD))
    .command('check', async (ctx) => {
        const message = await ctx.reply(`${WHITE_QUESTION_MARK} GDrive checking...`)
        try {
            await ctx.gdrive.checkOperational()
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                message.message_id,
                undefined,
                `${GREEN_MARK} GDrive operational`
            )
        } catch (e) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                message.message_id,
                undefined,
                `${RED_CROSS} GDrive FAILED\n${e}`
            )
        }
    })
export default scene
