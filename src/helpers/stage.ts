import Telegraf, { ContextMessageUpdate, Stage } from 'telegraf'
import { SCENE } from '../const/sceneId'
import main from '../scenes/main'
import addTeam from '../scenes/addTeam'
import uploadDocument from '../scenes/uploadDocument'

export function setupStage<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    const stage = new Stage([main, addTeam, uploadDocument], { default: SCENE.MAIN })

    bot.use(stage.middleware())
}
