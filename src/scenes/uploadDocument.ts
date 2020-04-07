import { WizardScene } from '../helpers/wizard'
import strings, { __ } from '../helpers/strings'
import { CallbackButton, Composer, ContextMessageUpdate, Extra, Markup } from 'telegraf'
import { SCENE } from '../const/sceneId'
import urlRegex from 'url-regex'
import { drive_v3 } from 'googleapis'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'
import * as url from 'url'
import Team from '../models/Team'
import Schema$File = drive_v3.Schema$File

const phrases = strings.uploadDocument
const feedbackPhrases = strings.feedback
const feedbackUrl = 'https://forms.gle/LgQ9H13rNfTaxqCQ6'

const TEAMS_PAGE_SIZE = 99 // + кнопки пагинации

/*
 * Шаги:
 * выбрать для какого типа документ
 * загрузить документ
 */

// "selTeam0000" => 0000
const teamSelector = new Composer()
    .action(/^selTeam(\d+)$/, async (ctx) => {
        const teamId = +ctx.match[1]
        const team = await Team.query().findById(teamId)

        await ctx.editMessageText(phrases.teamChosen__html({ team: team.name }), Extra.HTML(true) as ExtraEditMessage)

        ctx.wizard.state['teamId'] = teamId
        ctx.wizard.next()

        return replyWithMilestonesAsker(ctx)
    })
    .action(/^teamPage(\d+)$/, async (ctx) => {
        const page = +ctx.match[1]

        let teamsBtns = await teamsButtonsWithPagination(page)
        return ctx.editMessageText(
            __('uploadDocument.askTeam'),
            Markup.inlineKeyboard(teamsBtns)
                .resize()
                .extra()
        )
    })
    .use(async (ctx) => {
        if (!ctx.user.team.isAdmin) {
            ctx.wizard.next() // пропускаем вопрос про команду
            ctx.wizard.state['teamId'] = ctx.user.team.$id()
            return replyWithMilestonesAsker(ctx)
        }

        let teamsBtns = await teamsButtonsWithPagination()
        return ctx.reply(
            __('uploadDocument.askTeam'),
            Markup.inlineKeyboard(teamsBtns)
                .resize()
                .extra()
        )
    })

function replyWithMilestonesAsker(ctx: ContextMessageUpdate) {
    const buttons = ctx.config.milestones.map(({ title, slug }) => [Markup.callbackButton(title, `selMile${slug}`)])
    return ctx.reply(
        __('uploadDocument.askMilestone'),
        Markup.inlineKeyboard(buttons)
            .resize()
            .extra()
    )
}

// "selMile0000" => 0000
const milestoneSelector = Composer.action(/^selMile(.+)$/, async (ctx) => {
    const milestoneSlug = ctx.match[1]
    const milestone = ctx.config.milestones.find(({ slug }) => slug === milestoneSlug)

    await ctx.editMessageText(
        __('uploadDocument.milestoneChosen__html', { milestone: milestone.title }),
        Extra.HTML(true) as ExtraEditMessage
    )

    ctx.wizard.state['milestoneSlug'] = milestoneSlug
    ctx.wizard.next()

    await ctx.reply(__('uploadDocument.askDocument'))
})

const fileGetter = new Composer()
    .on('text', async (ctx) => {
        const fileId = getGDriveIdFromLink(ctx.message.text)

        if (typeof fileId !== 'string') {
            return ctx.reply(__('uploadDocument.noLinkFound'))
        }

        let file: Schema$File
        try {
            const response = await ctx.gdrive.drive.files.get({ fileId })
            file = response.data
        } catch (e) {
            await ctx.reply(__('uploadDocument.noAccessToLink'))
            throw e
        }

        if (!ctx.config.upload.allowedMIMEs.includes(file.mimeType)) {
            return ctx.reply(__('uploadDocument.wrongFileType'))
        }

        const progressMessage = await ctx.reply(__('uploadDocument.uploadProgress'))

        const milestone = ctx.config.milestones.find(({ slug }) => slug === ctx.wizard.state['milestoneSlug'])
        const team = await Team.query().findById(ctx.wizard.state['teamId'])
        try {
            await ctx.upload.copyFromGDrive(fileId, {
                milestoneSlug: milestone.slug,
                team
            })
        } catch (e) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                progressMessage.message_id,
                undefined,
                __('uploadDocument.errorUploading')
            )
            await ctx.scene.leave()
            throw e // чтобы засечь в sentry
        }

        const groupFolderLink = ctx.gdrive.getLinkForFile(team.gdriveFolderId)
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMessage.message_id,
            undefined,
            __('uploadDocument.successUploading__html', {
                documentTitle: milestone.title,
                folderLink: groupFolderLink
            }),
            Extra.HTML(true) as ExtraEditMessage
        )

        return ctx.scene.enter(SCENE.MAIN)
    })
    .on('document', async (ctx) => {
        const documentMime = ctx.message.document.mime_type

        const allowedFile = ctx.config.upload.allowedMIMEs.includes(documentMime)
        if (!allowedFile) {
            return ctx.reply(__('uploadDocument.wrongFileType'))
        }

        const progressMessage = await ctx.reply(__('uploadDocument.uploadProgress'))

        const milestone = ctx.config.milestones.find(({ slug }) => slug === ctx.wizard.state['milestoneSlug'])
        const team = await Team.query().findById(ctx.wizard.state['teamId'])
        try {
            const url = await ctx.telegram.getFileLink(ctx.message.document.file_id)
            await ctx.upload.uploadTelegramDocument(
                { url, mime: documentMime },
                {
                    milestoneSlug: milestone.slug,
                    team: team
                }
            )
        } catch (e) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                progressMessage.message_id,
                undefined,
                __('uploadDocument.errorUploading')
            )
            await ctx.scene.leave()
            throw e // чтобы засечь в sentry
        }

        const groupFolderLink = ctx.gdrive.getLinkForFile(team.gdriveFolderId)
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMessage.message_id,
            undefined,
            __('uploadDocument.successUploading__html', {
                documentTitle: milestone.title,
                folderLink: groupFolderLink
            }),
            Extra.HTML(true) as ExtraEditMessage
        )

        return ctx.scene.enter(SCENE.MAIN)
    })

const scene = new WizardScene(SCENE.UPLOAD_DOCUMENT, { cancelable: true }, teamSelector, milestoneSelector, fileGetter)

// TODO реализовать сцены без прелюдии. Поскольку в этом боте почти все сцены - формочки,
// то надо бы сразу переходить к полям
scene.enter((ctx, next) => {
    setTimeout(
        () =>
            ctx.reply(
                feedbackPhrases.ask(),
                Markup.inlineKeyboard([Markup.urlButton(feedbackPhrases.btn(), feedbackUrl)]).extra()
            ),
        15 * 60 * 60000 // 15 min
    )
    return scene.middleware.call(scene)(ctx, next)
})

export default scene

/*
example acceptable links:
https://drive.google.com/open?id=10ZE1hNdn1GVmAwtoaqNE3SU8buTcWcdWqD5u8St4so8
https://docs.google.com/document/d/10ZE1hNdn1GVmAwtoaqNE3SU8buTcWcdWqD5u8St4so8/edit
https://docs.google.com/presentation/d/1-yMTieiEdJ4-OaMISvj4LLgftJpE-nyZALwaXvFHQSI/edit
https://docs.google.com/file/d/1-yMTieiEdJ4-OaMISvj4LLgftJpE-nyZALwaXvFHQSI/edit

[http://](docs|drive).google.com/.../[d/<FILE_ID>/]?[open=<FILE_ID>]
*/

function getGDriveIdFromLink(link: string): void | string {
    const rx = urlRegex({ exact: false, strict: false })
    const links = link.match(rx)
    if (!links || !links.length) return
    let firstLink = links[0]
    if (!firstLink.includes('://')) firstLink = 'https://' + firstLink

    const firstLinkParsed = url.parse(firstLink, true)

    if (!['docs.google.com', 'drive.google.com'].includes(firstLinkParsed.hostname)) return

    const paths = firstLinkParsed.pathname.split('/')
    if (paths.includes('d')) return paths[paths.indexOf('d') + 1]

    return firstLinkParsed.query['id'] as string
}

async function teamsButtonsWithPagination(page: number = 0): Promise<CallbackButton[][]> {
    const teams = await Team.query()
        .where('isAdmin', false)
        .page(page, TEAMS_PAGE_SIZE)
    let teamsBtns = teams.results.map((team) => [Markup.callbackButton(team.name, `selTeam${team.$id()}`)])

    const pagesTotal = Math.ceil(teams.total / TEAMS_PAGE_SIZE)

    if (teams.total > TEAMS_PAGE_SIZE) {
        const pagination = [
            page > 0 && Markup.callbackButton(`⬅`, `teamPage${page - 1}`),
            Markup.callbackButton(`${page + 1} из ${pagesTotal}`, 'noop'),
            page < pagesTotal - 1 && Markup.callbackButton(`➡`, `teamPage${page + 1}`)
        ].filter((a) => !!a)

        teamsBtns.push(pagination)
    }

    return teamsBtns
}
