import TrelloService from '../services/TrelloService';
import Telegraf, { ContextMessageUpdate } from 'telegraf';
import AppVar, { APP_TRELLO_TOKEN_KEY } from '../models/AppVar';

export async function setupTrello<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    let token = await AppVar.query().findById(APP_TRELLO_TOKEN_KEY);
    const service = new TrelloService(token?.value);

    return service;
}
