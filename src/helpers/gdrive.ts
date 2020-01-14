import Telegraf, { ContextMessageUpdate } from 'telegraf'
import GDriveService from '../services/GDriveService'
import { JWTInput } from 'google-auth-library/build/src/auth/credentials'

const debug = require('debug')('bot:context:gdrive')

export async function bindGDrive<T extends ContextMessageUpdate>(
    bot: Telegraf<T>,
    settings: JWTInput,
    rootFolderId: string
) {
    const gdrive = new GDriveService(settings, rootFolderId)

    bot.use((ctx, next) => {
        ctx.gdrive = gdrive
        return next()
    })

    debug('GDrive attached to Context.')

    await gdrive.authorized

    debug('GDrive authorized.')

    return gdrive
}
