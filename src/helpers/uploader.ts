import Telegraf, { ContextMessageUpdate } from 'telegraf'
import GDriveService from '../services/GDriveService'
import { BotConfig } from 'bot-config'
import TrelloService from '../services/TrelloService'
import UploaderService from '../services/UploadService'

const debug = require('debug')('bot:context:gdrive')

export async function bindUploader<T extends ContextMessageUpdate>(
    bot: Telegraf<T>,
    config: BotConfig,
    { gdrive, trello }: { trello: TrelloService; gdrive: GDriveService }
) {
    const uploader = new UploaderService(gdrive, trello, config.milestones, config.upload.fileMask)

    bot.use((ctx, next) => {
        ctx.upload = uploader
        return next()
    })

    debug('Uploader initialized.')

    return uploader
}
