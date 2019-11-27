import TrelloService from '../services/TrelloService';
import Telegraf, { ContextMessageUpdate } from 'telegraf';
import AppVar, { APP_TRELLO_TOKEN_KEY } from '../models/AppVar';

const debug = require('debug')('bot:context:trello');

export async function bindTrello<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    let tokenVar = await AppVar.query().findById(APP_TRELLO_TOKEN_KEY);
    const token = tokenVar?.value;

    if (token) {
        debug('Use saved key-token.');
    } else {
        debug(`No saved key-token found. Use 'anonymous' state.`);
    }

    const service = new TrelloService(token);

    bot.use((ctx, next) => {
        ctx.trello = service;
        return next();
    });

    debug('Trello attached to Context.');

    return service;
}
