import Telegraf, { ContextMessageUpdate } from 'telegraf';
import GDriveService, { OAuthClientSettings } from '../services/GDriveService';
import AppVar, { APP_GDRIVE_ACCESS_TOKEN } from '../models/AppVar';

export async function setupGDrive<T extends ContextMessageUpdate>(bot: Telegraf<T>, settings: OAuthClientSettings) {
    const gdrive = new GDriveService();

    let token = await AppVar.query().findById(APP_GDRIVE_ACCESS_TOKEN);
    if (token) gdrive.setCredentials(JSON.parse(token.value));

    return gdrive;
}
