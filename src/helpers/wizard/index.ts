import {
    BaseScene,
    BaseSceneOptions,
    ContextMessageUpdate,
    Middleware,
    SceneContextMessageUpdate,
    Stage
} from 'telegraf'

import WizardContext from './context'
import { SCENE } from '../../const/sceneId'
// @ts-ignore -- магический метод unwrap. Не знаю для чего он нужен, но вот тут реально опасно, а ещё command...
const { compose, unwrap, optional, command } = BaseScene

interface WizardSceneOptions<TContext extends SceneContextMessageUpdate> extends BaseSceneOptions<TContext> {
    steps: Middleware<TContext>[]
    cancelable?: boolean
}

export class WizardScene extends BaseScene<ContextMessageUpdate> {
    options!: WizardSceneOptions<ContextMessageUpdate>

    constructor(id, options, ...steps) {
        super(id, options)
        this.id = id
        this.options = {
            steps,
            leaveHandlers: [],
            cancelable: false,
            ...options
        }
        this.leaveHandler = compose(this.options.leaveHandlers)
    }

    get ttl() {
        return this.options.ttl
    }

    set ttl(value) {
        this.options.ttl = value
    }

    leave = (...fns) => {
        this.leaveHandler = compose([this.leaveHandler, ...fns])
        return this
    }

    leaveMiddleware = () => this.leaveHandler

    middleware(): Middleware<ContextMessageUpdate> {
        return compose([
            optional(this.options.cancelable, command('cancel', Stage.enter(SCENE.MAIN))),
            (ctx, next) => {
                ctx.wizard = new WizardContext(ctx, this.options.steps)
                return next()
            },
            super.middleware(),
            (ctx, next) => {
                if (!ctx.wizard.step) {
                    ctx.wizard.selectStep(0)
                    return ctx.scene.leave()
                }
                return unwrap(ctx.wizard.step)(ctx, next)
            }
        ])
    }
}
