import { WizardScene } from '../helpers/wizard'
import { __ } from '../helpers/strings'
import { CallbackButton, Composer, ContextMessageUpdate, Extra, Markup } from 'telegraf'
import format from 'string-template'
import { SCENE } from '../const/sceneId'
import urlRegex from 'url-regex'
import { drive_v3 } from 'googleapis'
import Document from '../models/Document'
import request from 'request'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'
import * as url from 'url'
import { transaction } from 'objection'
import Team from '../models/Team'
import Schema$File = drive_v3.Schema$File

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

        await ctx.editMessageText(
            __('uploadDocument.teamChosen__html', { team: team.name }),
            Extra.HTML(true) as ExtraEditMessage
        )

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
    const buttons = ctx.config.milestones.map((title, i) => [Markup.callbackButton(title, `selMile${i}`)])
    return ctx.reply(
        __('uploadDocument.askMilestone'),
        Markup.inlineKeyboard(buttons)
            .resize()
            .extra()
    )
}

// "selMile0000" => 0000
const milestoneSelector = Composer.action(/^selMile(\d+)$/, async (ctx) => {
    const milestoneId = +ctx.match[1]

    await ctx.editMessageText(
        __('uploadDocument.milestoneChosen__html', { milestone: ctx.config.milestones[milestoneId] }),
        Extra.HTML(true) as ExtraEditMessage
    )

    ctx.wizard.state['milestoneId'] = milestoneId
    ctx.wizard.next()

    await ctx.reply(__('uploadDocument.askDocument'))
})

async function handleGDriveUpload(
    ctx: ContextMessageUpdate,
    { gdriveFileId, teamId, milestoneId }: { gdriveFileId?: string; teamId: number; milestoneId: number }
): Promise<any> {
    const progressMessage = await ctx.reply(__('uploadDocument.uploadProgress'))

    const teamMilestoneDocuments = Document.query().where({
        teamId,
        milestone: milestoneId
    })

    const currentDocumentsCount = await teamMilestoneDocuments.resultSize()

    const name = format(ctx.config.fileMask, {
        versionNumber: currentDocumentsCount + 1,
        milestoneTitle: ctx.config.milestones[milestoneId],
        milestoneNum: milestoneId + 1
    })
    const resource = {
        name,
        parents: [ctx.user.team.gdriveFolderId]
    }

    let gdrivePromise
    if (gdriveFileId) {
        gdrivePromise = ctx.gdrive.drive.files.copy({ fileId: gdriveFileId, requestBody: resource, fields: 'id' })
    } else {
        const link = await ctx.telegram.getFileLink(ctx.message.document.file_id)
        const media = {
            mimeType: ctx.message.document.mime_type,
            body: request(link)
        }
        gdrivePromise = ctx.gdrive.drive.files.create({ requestBody: resource, media, fields: 'id' })
    }
    const trelloAttachmentsPath = `/1/cards/${ctx.user.team.trelloCardId}/attachments`

    let insertedDocument
    try {
        const {
            data: { id: newFileId }
        } = await gdrivePromise
        const gdriveAccessUrl = ctx.gdrive.getLinkForFile(newFileId)

        const { id: trelloAttachId } = await ctx.trello.post({
            path: trelloAttachmentsPath,
            options: { name, url: gdriveAccessUrl }
        })

        insertedDocument = await Document.query().insertAndFetch({
            teamId,
            gdriveFileId: newFileId,
            trelloAttachmentId: trelloAttachId,
            milestone: milestoneId
        })
    } catch (e) {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMessage.message_id,
            undefined,
            __('uploadDocument.errorUploading')
        )
        await ctx.scene.leave()
        throw e
    }

    await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMessage.message_id,
        undefined,
        __('uploadDocument.successUploading__html', { filename: name }),
        Extra.HTML(true) as ExtraEditMessage
    )

    await transaction(Document.knex(), async (tx) => {
        const staleDocumentsQ = teamMilestoneDocuments.transacting(tx).whereNot({
            [Document.idColumn]: insertedDocument.$id(),
            trelloAttachmentId: null
        })

        const staleDocuments = await staleDocumentsQ
        await Promise.all(
            staleDocuments.map(({ trelloAttachmentId: attachmentId }) =>
                ctx.trello.delete({ path: `${trelloAttachmentsPath}/${attachmentId}` }).catch((e) => {
                    if (e.statusCode !== 404) throw e
                })
            )
        )

        await staleDocumentsQ.patch({ trelloAttachmentId: null })
    })
}

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

        if (!ctx.config.allowedMIMEs.includes(file.mimeType)) {
            return ctx.reply(__('uploadDocument.wrongFileType'))
        }

        await handleGDriveUpload(ctx, {
            gdriveFileId: fileId,
            milestoneId: ctx.wizard.state['milestoneId'],
            teamId: ctx.wizard.state['teamId']
        })
        return ctx.scene.enter(SCENE.MAIN)
    })
    .on('document', async (ctx) => {
        const allowedFile = ctx.config.allowedMIMEs.includes(ctx.message.document.mime_type)
        if (!allowedFile) {
            return ctx.reply(__('uploadDocument.wrongFileType'))
        }

        await handleGDriveUpload(ctx, {
            milestoneId: ctx.wizard.state['milestoneId'],
            teamId: ctx.wizard.state['teamId']
        })
        return ctx.scene.enter(SCENE.MAIN)
    })

const scene = new WizardScene(SCENE.UPLOAD_DOCUMENT, { cancelable: true }, teamSelector, milestoneSelector, fileGetter)

// TODO реализовать сцены без прелюдии. Поскольку в этом боте почти все сцены - формочки,
// то надо бы сразу переходить к полям
scene.enter((ctx, next) => {
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
