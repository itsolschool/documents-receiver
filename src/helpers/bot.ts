import Telegraf, { ContextMessageUpdate } from 'telegraf';
import { decorate, inject, injectable } from 'inversify';
import { STAGE } from '../constant/scenes';
import { REDIS_SESSION } from '../constant/middlewares';
import { BotStage } from './stage';
import RedisSession from 'telegraf-session-redis';
import attachUser from '../middlewares/attachUser';

decorate(injectable(), Telegraf);

@injectable()
// @ts-ignore
export class TelegrafBot extends Telegraf<ContextMessageUpdate> implements Telegraf<ContextMessageUpdate> {
    constructor(@inject(STAGE) stage: BotStage, @inject(REDIS_SESSION) session: RedisSession, token: string) {
        super(token);

        this.use(session.middleware(), stage.middleware(), attachUser);

        this.telegram.getMe().then((botinfo) => (this.options.username = botinfo.username));

        return this;
    }
}
