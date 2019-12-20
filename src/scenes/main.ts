import { BaseScene, ContextMessageUpdate, Markup, Stage } from 'telegraf'
import checkUserIsAdmin from '../middlewares/checkUserIsAdmin'
import { GREEN_MARK, RED_CROSS, WHITE_QUESTION_MARK } from '../const/emojies'
import { SCENE } from '../const/sceneId'
import { __ } from '../helpers/strings'

const scene = new BaseScene<ContextMessageUpdate>(SCENE.MAIN)
scene
    .enter(replyWithMainView)
    .hears(__('main.btns.uploadDocuments'), Stage.enter(SCENE.UPLOAD_DOCUMENT))
    .hears(__('main.btns.addTeam'), checkUserIsAdmin, Stage.enter(SCENE.TEAM_ADD))
    .hears(__('main.btns.setupGDrive'), checkUserIsAdmin, Stage.enter(SCENE.GDRIVE_SETUP))
    .hears(__('main.btns.healthcheck'), async (ctx) => {
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
    .use(replyWithMainView)

const ADMIN_MARKUP = Markup.keyboard([
    [__('main.btns.addTeam'), __('main.btns.setupGDrive')],
    [__('main.btns.healthcheck')]
])
    .oneTime(true)
    .resize(true)
    .extra()
const USER_MARKUP = Markup.keyboard([[__('main.btns.uploadDocuments')]])
    .oneTime(true)
    .resize(true)
    .extra()

async function replyWithMainView(ctx: ContextMessageUpdate) {
    if (ctx.user.team.isAdmin) {
        await ctx.reply(__('main.admin'), ADMIN_MARKUP)
    } else {
        await ctx.replyWithHTML(__('main.user__html', { team: ctx.user.team.name }), USER_MARKUP)
    }
}

export default scene
