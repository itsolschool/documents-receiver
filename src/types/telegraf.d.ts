import * as tt from '../../node_modules/telegraf/typings/telegram-types.d';

import { Extra, Middleware, SceneContext, SceneContextMessageUpdate } from 'telegraf';

declare module 'telegraf' {
    export class WizardContext {
        next();

        back();

        selectStep(index: number): WizardContext;
    }

    export class ContextMessageUpdate implements SceneContextMessageUpdate {
        // public dbchat: InstanceType<Chat>

        wizard: WizardContext;
        scene: SceneContext<this>;
        session: any;

        replyWithMarkdown(markdown: string, extra?: tt.ExtraEditMessage | Extra): Promise<tt.Message>;
    }

    export interface Composer<TContext extends ContextMessageUpdate> {
        action(
            action: string | string[] | RegExp,
            middleware: Middleware<TContext>,
            ...middlewares: Array<Middleware<TContext>>
        ): Composer<TContext>;
    }
}
