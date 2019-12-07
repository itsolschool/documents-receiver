import { BaseScene, Composer, ContextMessageUpdate, Middleware, Stage } from 'telegraf'
import { SCENE } from '../const/sceneId'

// @ts-ignore -- потому что command не является публичным статическим интерфейсом в .d.ts
const { compose, command } = Composer

export class CancelableScene<T extends ContextMessageUpdate> extends BaseScene<T> {
    middleware(): Middleware<T> {
        return compose([command('cancel', Stage.enter(SCENE.MAIN)), super.middleware()])
    }
}
