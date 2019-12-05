import Telegraf, { ContextMessageUpdate, Stage } from 'telegraf'
import { SCENE } from '../const/sceneId'
import referral from '../scenes/referral'
import main from '../scenes/main'
import gdrive from '../scenes/gdrive'
import addTeam from '../scenes/addTeam'
import uploadDocument from '../scenes/uploadDocument'

export function setupStage<T extends ContextMessageUpdate>(bot: Telegraf<T>) {
    const stage = new Stage([gdrive, referral, main, addTeam, uploadDocument], { default: SCENE.MAIN })

    bot.use(stage.middleware())
}
