import * as tt from '../../node_modules/telegraf/typings/telegram-types.d'
import User from '../models/User'
import GDriveService from '../services/GDriveService'
import TrelloService from '../services/TrelloService'
import UploadService from '../services/UploadService'
import { Extra, Middleware, SceneContext, SceneContextMessageUpdate } from 'telegraf'
import { RedisClient } from 'redis'
import WizardContext from '../helpers/wizard/context'
import { BotConfig } from 'bot-config'

declare module 'telegraf' {
    export class ContextMessageUpdate implements SceneContextMessageUpdate {
        redis: RedisClient
        config: BotConfig
        user: User | undefined
        wizard: WizardContext<this>
        scene: SceneContext<this>
        session: any // вот тут творится полная анархия. одни классы пишут, другие пытаются использовать...
        gdrive: GDriveService
        trello: TrelloService
        upload: UploadService

        replyWithMarkdown(markdown: string, extra?: tt.ExtraEditMessage | Extra): Promise<tt.Message>
    }

    export interface Composer<TContext extends ContextMessageUpdate> {
        action(
            action: string | string[] | RegExp,
            middleware: Middleware<TContext>,
            ...middlewares: Array<Middleware<TContext>>
        ): Composer<TContext>
    }
}
