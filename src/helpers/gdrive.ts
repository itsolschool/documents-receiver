import Telegraf, { ContextMessageUpdate } from 'telegraf';
import GDriveService, { APP_ACCESS_TOKEN_KEY, OAuthClientSettings } from '../service/GDrive';
import AppVar from '../models/AppVar';

export async function setupGDrive<T extends ContextMessageUpdate>(bot: Telegraf<T>, settings: OAuthClientSettings) {
    const gdrive = new GDriveService(settings);

    let token = await AppVar.query().findById(APP_ACCESS_TOKEN_KEY);
    if (token) gdrive.setCredentials(JSON.parse(token.value));

    bot.use((ctx, next) => {
        ctx.gdrive = gdrive;
        return next();
    });

    return gdrive;
}
