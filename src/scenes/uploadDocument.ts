import { WizardScene } from '../helpers/wizard'
import { __ } from '../helpers/strings'
import { Composer, ContextMessageUpdate, Extra, Markup } from 'telegraf'
import format from 'string-template'
import { SCENE } from '../const/sceneId'
import urlRegex from 'url-regex'
import { drive_v3 } from 'googleapis'
import Document from '../models/Document'
import request from 'request'
import { transaction } from 'objection'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'
import * as url from 'url'
import Schema$File = drive_v3.Schema$File

/*
 * Шаги:
 * выбрать для какого типа документ
 * загрузить документ
 */

const milestoneSelector = new Composer()
    .action(/^selMile(\d+)$/, async (ctx) => {
        const milestoneId = +ctx.match[1]
        await ctx.editMessageText(
            __('uploadDocument.milestoneChosen__html', { milestone: ctx.config.milestones[milestoneId] }),
            Extra.HTML(true) as ExtraEditMessage
        )
        ctx.wizard.state['milestoneId'] = milestoneId
        ctx.wizard.next()
        await ctx.reply(__('uploadDocument.askDocument'))
    })
    .use((ctx, next) => {
        debugger
        return next()
    })

async function handleGDriveUpload(ctx: ContextMessageUpdate, fileId?: string): Promise<any> {
    const milestoneId = ctx.wizard.state['milestoneId']
    const progressMessage = await ctx.reply(__('uploadDocument.uploadProgress'))

    const { lastDocument, lastVersion } = await transaction(Document.knex(), async (tx) => ({
        lastVersion: await Document.query(tx)
            .where({
                teamId: ctx.user.teamId,
                milestone: milestoneId
            })
            .resultSize(),
        lastDocument: await Document.query(tx)
            .where({
                teamId: ctx.user.teamId,
                milestone: milestoneId
            })
            .orderBy('attachedTime', 'desc')
            .first()
    }))

    const name = format(ctx.config.fileMask, {
        versionNumber: lastVersion + 1,
        milestoneTitle: ctx.config.milestones[milestoneId],
        milestoneNum: milestoneId + 1
    })
    const resource = {
        name,
        parents: [ctx.user.team.gdriveFolderId]
    }

    let gdrivePromise
    if (fileId) {
        gdrivePromise = ctx.gdrive.drive.files.copy({ fileId, requestBody: resource, fields: 'id' })
    } else {
        const link = await ctx.telegram.getFileLink(ctx.message.document.file_id)
        const media = {
            mimeType: ctx.message.document.mime_type,
            body: request(link)
        }
        gdrivePromise = ctx.gdrive.drive.files.create({ requestBody: resource, media, fields: 'id' })
    }
    const trelloAttachmentsPath = `/1/cards/${ctx.user.team.trelloCardId}/attachments`

    try {
        const {
            data: { id: newFileId }
        } = await gdrivePromise
        const gdriveAccessUrl = `https://drive.google.com/open?id=${newFileId}`

        const { id: trelloAttachId } = await ctx.trello.post({
            path: trelloAttachmentsPath,
            options: { name, url: gdriveAccessUrl }
        })

        await Document.query().insert({
            teamId: ctx.user.teamId,
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

    if (lastDocument) {
        await ctx.trello.delete({ path: `${trelloAttachmentsPath}/${lastDocument.trelloAttachmentId}` })

        lastDocument.trelloAttachmentId = null
        await Document.query()
            .findById(lastDocument.$id())
            .patch(lastDocument)
    }
}

const fileGetter = /*new Composer().use(*/ async (ctx) => {
    const fileId = getGDriveIdFromLink(ctx.message.text)

    let file: Schema$File
    try {
        const response = await ctx.gdrive.drive.files.get({ fileId })
        file = response.data
    } catch (e) {
        await ctx.reply(__('uploadDocument.incorrectLink'))
        throw e
    }
    const _ = ctx.config.allowedMIMEs.includes(file.mimeType)
    if (!ctx.config.allowedMIMEs.includes(file.mimeType)) {
        return ctx.reply(__('uploadDocument.wrongFileType'))
    }

    await handleGDriveUpload(ctx, fileId as string)
    return ctx.scene.leave()
}
// TODO реализовать загрузку файлов
// .on('document',()=>void )

const scene = new WizardScene(SCENE.UPLOAD_DOCUMENT, { cancelable: true }, milestoneSelector, fileGetter)

scene.enter((ctx) => {
    const buttons = ctx.config.milestones.map((title, i) => [Markup.callbackButton(title, `selMile${i}`)])
    return ctx.reply(
        __('uploadDocument.askMilestone'),
        Markup.inlineKeyboard(buttons)
            .resize()
            .extra()
    )
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
