import { BaseScene, ContextMessageUpdate, Markup, Stage } from 'telegraf'
import checkUserIsAdmin from '../middlewares/checkUserIsAdmin'
import { SCENE } from '../const/sceneId'
import { __ } from '../helpers/strings'
import { GREEN_MARK, RED_CROSS, WHITE_QUESTION_MARK } from '../const/emojies'

enum ACTIONS {
    UPLOAD_DOCUMENT = 'uploadDoc',
    CREATE_TEAM = 'createTeam',
    HEALTH_CHECK = 'healthCheck'
}

const scene = new BaseScene<ContextMessageUpdate>(SCENE.MAIN)
scene
    .enter(replyWithMainView)
    .action(ACTIONS.UPLOAD_DOCUMENT, removeActions, Stage.enter(SCENE.UPLOAD_DOCUMENT))
    .action(ACTIONS.CREATE_TEAM, checkUserIsAdmin, removeActions, Stage.enter(SCENE.TEAM_ADD))
    .action(ACTIONS.HEALTH_CHECK, checkUserIsAdmin, removeActions, gdriveHealthcheck)
    .use(replyWithMainView)

async function replyWithMainView(ctx: ContextMessageUpdate) {
    if (ctx.user.team.isAdmin) {
        // @ts-ignore -- потому что telegraf хочет кнопки только одного типа
        const ADMIN_MARKUP = Markup.inlineKeyboard([
            [
                Markup.callbackButton(__('main.btns.addTeam'), ACTIONS.CREATE_TEAM),
                Markup.callbackButton(__('main.btns.uploadDocuments'), ACTIONS.UPLOAD_DOCUMENT)
            ],
            [Markup.callbackButton(__('main.btns.gdriveHealthcheck'), ACTIONS.HEALTH_CHECK)],
            [Markup.urlButton('GDrive', ctx.gdrive.getLinkForFile(ctx.config.gdrive.rootDirId))]
        ])
            .oneTime(true)
            .resize(true)
            .extra()
        return ctx.reply(__('main.admin'), ADMIN_MARKUP)
    } else {
        //@ts-ignore -- опять только кнопки одного типа
        const USER_MARKUP = Markup.inlineKeyboard([
            [Markup.callbackButton(__('main.btns.uploadDocuments'), ACTIONS.UPLOAD_DOCUMENT)],
            [Markup.urlButton(__('main.btns.uploadedFiles'), ctx.gdrive.getLinkForFile(ctx.user.team.gdriveFolderId))]
        ])
            .oneTime(true)
            .resize(true)
            .extra()
        await ctx.reply(__('main.user', { team: ctx.user.team.name }), USER_MARKUP)
    }
}

async function removeActions(ctx: ContextMessageUpdate, next: () => any) {
    await ctx.editMessageText(ctx.callbackQuery.message.text)
    return next()
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
    return replyWithMainView(ctx)
}
