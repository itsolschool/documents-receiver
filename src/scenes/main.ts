import { BaseScene, ContextMessageUpdate, Markup, Stage } from 'telegraf'
import checkUserIsAdmin from '../middlewares/checkUserIsAdmin'
import { SCENE } from '../const/sceneId'
import { __ } from '../helpers/strings'
import { GREEN_MARK, RED_CROSS, WHITE_QUESTION_MARK } from '../const/emojies'

const scene = new BaseScene<ContextMessageUpdate>(SCENE.MAIN)
scene
    .enter(replyWithMainView)
    .hears(__('main.btns.uploadDocuments'), Stage.enter(SCENE.UPLOAD_DOCUMENT))
    .hears(__('main.btns.addTeam'), checkUserIsAdmin, Stage.enter(SCENE.TEAM_ADD))
    .hears(__('main.btns.gdriveHealthcheck'), checkUserIsAdmin, gdriveHealthcheck)
    .use(replyWithMainView)

const ADMIN_MARKUP = Markup.keyboard([
    [__('main.btns.addTeam'), __('main.btns.uploadDocuments')],
    [__('main.btns.gdriveHealthcheck')]
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

async function gdriveHealthcheck(ctx: ContextMessageUpdate) {
    const { gdrive } = ctx
    const emptyInlineMessageId = undefined

    const statusMessage = await ctx.reply(`${WHITE_QUESTION_MARK} GDrive checking...`)
    try {
        await gdrive.checkOperational()
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            statusMessage.message_id,
            emptyInlineMessageId,
            `${GREEN_MARK} GDrive operational`
        )
    } catch (e) {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            statusMessage.message_id,
            emptyInlineMessageId,
            `${RED_CROSS} GDrive FAILED\n${e}`
        )

        const email = gdrive.serviceAccountEmail,
            folderLink = gdrive.getLinkForFile(gdrive.rootFolderId)

        const keyboard = Markup.inlineKeyboard([Markup.urlButton(__('gdrive.btns.openDirLink'), folderLink)])
        await ctx.replyWithHTML(__('gdrive.shareDir__html', { email }), keyboard.extra())
    }
}
