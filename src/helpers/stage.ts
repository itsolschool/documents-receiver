import Telegraf, { ContextMessageUpdate, Stage } from 'telegraf'
import referral from '../scenes/referral'
import main from '../scenes/main'
import gdrive from '../scenes/gdrive'
import addTeam from '../scenes/addTeam'
import { SCENE } from '../const/sceneId'

export function setupStage<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    const stage = new Stage([gdrive, referral, main, addTeam], { default: SCENE.MAIN })

    bot.use(stage.middleware())
}
