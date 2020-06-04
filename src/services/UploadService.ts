import GDriveService from './GDriveService'
import TrelloService from './TrelloService'
import Team from '../models/Team'
import Document from '../models/Document'
import request from 'request'
import { PassThrough } from 'stream'
import format from 'string-template'
import { transaction } from 'objection'
import { BotConfig } from 'bot-config'
import { drive_v3 } from 'googleapis'
import Schema$File = drive_v3.Schema$File

export type UploadContext = {
    milestoneSlug: string
    team: Team
}

export default class UploadService {
    constructor(
        private driveService: GDriveService,
        private trelloService: TrelloService,
        private milestones: BotConfig['milestones'],
        private uploadFileMask: string
    ) {}

    async uploadTelegramDocument({ url, mime }: { url: string; mime: string }, context: UploadContext) {
        const resource = await this.genGDriveResource(context)

        const media = {
            mimeType: mime,
            body: request(url).pipe(new PassThrough())
        }
        const gdriveFile = (
            await this.driveService.drive.files.create({
                requestBody: resource,
                media,
                fields: 'id,name'
            })
        ).data

        const trelloAttachId = await this.attachFileToCard(gdriveFile, context.team.trelloCardId)
        await this.insertDocument(gdriveFile, trelloAttachId, context)
        return gdriveFile
    }

    async copyFromGDrive(gdriveFileId: string, context: UploadContext) {
        const resource = await this.genGDriveResource(context)

        const gdriveFile = (
            await this.driveService.drive.files.copy({ fileId: gdriveFileId, requestBody: resource, fields: 'id' })
        ).data

        const trelloAttachId = await this.attachFileToCard(gdriveFile, context.team.trelloCardId)
        await this.insertDocument(gdriveFile, trelloAttachId, context)
        return gdriveFile
    }

    private async insertDocument(
        gdriveFile: drive_v3.Schema$File,
        trelloAttachId: string,
        { milestoneSlug, team }: UploadContext
    ) {
        const insertedDocument = await Document.query().insertAndFetch({
            teamId: team.$id(),
            gdriveFileId: this.driveService.getLinkForFile(gdriveFile.id),
            trelloAttachmentId: trelloAttachId,
            milestoneSlug: milestoneSlug
        })

        // TODO убрать потенциальную утечку и заюзать какой-нибудь task
        process.nextTick(() => this.cleanupStaleTrelloAttachments(insertedDocument.$id(), team))
    }

    private async attachFileToCard(gdriveFile: Schema$File, cardId: string) {
        const gdriveAccessUrl = this.driveService.getLinkForFile(gdriveFile.id)

        const trelloAttachmentsPath = this.trelloService.attachmentsUrlForCard(cardId)
        const { id: trelloAttachId } = await this.trelloService.post({
            path: trelloAttachmentsPath,
            options: { name: gdriveFile.name, url: gdriveAccessUrl }
        })
        return trelloAttachId
    }

    private async cleanupStaleTrelloAttachments(beforeId: any, team: Team) {
        await transaction(Document.knex(), async (tx) => {
            const document = await Document.query()
                .transacting(tx)
                .findById(beforeId)
                .eager('team')

            const staleDocumentsQ = Document.query()
                .transacting(tx)
                .whereNotNull('trelloAttachmentId')
                .andWhere('attachedTime', '<', document.attachedTime)
                .andWhere('teamId', team.$id())

            const attachmentsUrl = this.trelloService.attachmentsUrlForCard(team.trelloCardId)

            const staleDocuments = await staleDocumentsQ
            await Promise.all(
                staleDocuments.map(({ trelloAttachmentId }) =>
                    this.trelloService.delete({ path: `${attachmentsUrl}/${trelloAttachmentId}` }).catch((e) => {
                        if (e.statusCode !== 404) throw e
                    })
                )
            )

            await staleDocumentsQ.patch({ trelloAttachmentId: null })
        })
    }

    private async genGDriveResource({ milestoneSlug, team }: UploadContext) {
        const teamMilestoneDocumentsCount = await Document.query()
            .where({
                teamId: team.$id(),
                milestoneSlug
            })
            .resultSize()

        const milestone = this.milestones.find(({ slug }) => slug === milestoneSlug)
        const name = format(this.uploadFileMask, {
            versionNumber: teamMilestoneDocumentsCount + 1,
            milestoneTitle: milestone.title
        })

        const resource: Schema$File = {
            name,
            parents: [team.gdriveFolderId],
            properties: {
                ITSS_team_id: team.$id().toString()
            }
        }
        return resource
    }
}
