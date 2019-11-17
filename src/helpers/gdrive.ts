import Telegraf, { ContextMessageUpdate } from 'telegraf';
import GDriveService, { Credentials, OAuthClientSettings } from '../service/GDrive';

export function setupGDrive<T extends ContextMessageUpdate>(
    bot: Telegraf<T>,
    settings: OAuthClientSettings,
    credentials?: Credentials
) {
    const gdrive = new GDriveService(settings);

    if (credentials) {
        gdrive.setCredentials(credentials);
    }

    bot.use((ctx, next) => {
        ctx.gdrive = gdrive;
        return next();
    });

    return gdrive;
}
