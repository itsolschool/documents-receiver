import Telegraf, { ContextMessageUpdate } from 'telegraf';
import GDriveService, { OAuthClientSettings } from '../services/GDriveService';
import AppVar, { APP_GDRIVE_ACCESS_TOKEN_KEY } from '../models/AppVar';

const debug = require('debug')('bot:context:gdrive');

export async function bindGDrive<T extends ContextMessageUpdate>(bot: Telegraf<T>, settings: OAuthClientSettings) {
    const gdrive = new GDriveService(settings);

    let token = await AppVar.query().findById(APP_GDRIVE_ACCESS_TOKEN_KEY);
    if (token) {
        debug('Use saved GDrive access token.');
        gdrive.setCredentials(JSON.parse(token.value));
    } else {
        debug(`No access token for GDrive found. Use 'anonymous' state.`);
    }

    bot.use((ctx, next) => {
        ctx.gdrive = gdrive;
        return next();
    });

    debug('GDrive attached to Context.');

    return gdrive;
}
