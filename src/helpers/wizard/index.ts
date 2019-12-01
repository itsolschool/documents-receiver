import { BaseScene, BaseSceneOptions, ContextMessageUpdate, Middleware, SceneContextMessageUpdate } from 'telegraf';

import WizardContext from './context';
// @ts-ignore -- магический метод unwrap. Не знаю для чего он нужен, но вот тут реально опасно
const { compose, unwrap } = BaseScene;

interface WizardSceneOptions<TContext extends SceneContextMessageUpdate> extends BaseSceneOptions<TContext> {
    steps: Middleware<TContext>[]
}

export class WizardScene extends BaseScene<ContextMessageUpdate> {

    options!: WizardSceneOptions<ContextMessageUpdate>;

    constructor(id, options, ...steps) {
        super(id, options);
        this.id = id;
        this.options = {
            steps,
            leaveHandlers: [],
            ...options
        };
        this.leaveHandler = compose(this.options.leaveHandlers);
    }

    set ttl(value) {
        this.options.ttl = value;
    }

    get ttl() {
        return this.options.ttl;
    }

    leave = (...fns) => {
        this.leaveHandler = compose([this.leaveHandler, ...fns]);
        return this;
    };


    leaveMiddleware = () => this.leaveHandler;

    middleware(): Middleware<ContextMessageUpdate> {
        return compose([
            (ctx, next) => {
                ctx.wizard = new WizardContext(ctx, this.options.steps);
                return next();
            },
            super.middleware(),
            (ctx, next) => {
                if (!ctx.wizard.step) {
                    ctx.wizard.selectStep(0);
                    return ctx.scene.leave();
                }
                return unwrap(ctx.wizard.step)(ctx, next);
            }
        ]);
    }
}

