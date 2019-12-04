import { ContextMessageUpdate, Middleware } from 'telegraf'

const WIZARD_SESSION_CURSOR = '__WIZ__cursor'

class WizardContext<TContext extends ContextMessageUpdate, TState = object> {
    ctx: TContext
    steps: Middleware<TContext>[]
    state: TState

    constructor(ctx: TContext, steps) {
        this.ctx = ctx
        this.steps = steps
        // @ts-ignore -- сцена-то не очень подозревает, что же хранится у нас в состоянии
        this.state = ctx.scene.state
    }

    get cursor(): number {
        return this.state[WIZARD_SESSION_CURSOR] || 0
    }

    set cursor(cur) {
        this.state[WIZARD_SESSION_CURSOR] = cur
    }

    get step() {
        return this.cursor >= 0 && this.steps[this.cursor]
    }

    selectStep(index) {
        this.cursor = index
        return this
    }

    next() {
        return this.selectStep(this.cursor + 1)
    }

    back() {
        return this.selectStep(this.cursor - 1)
    }
}

export default WizardContext
