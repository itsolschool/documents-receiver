import { Composer, ContextMessageUpdate, Stage } from 'telegraf';
import { GDRIVE_SETUP_SCENE, MAIN_SCENE, REFERRAL } from '../constant/scenes';
import { decorate, inject, injectable } from 'inversify';

decorate(injectable(), Stage);
decorate(injectable(), Composer);

@injectable()
export class BotStage extends Stage<ContextMessageUpdate> {
    constructor(@inject(MAIN_SCENE) main, @inject(REFERRAL) referral, @inject(GDRIVE_SETUP_SCENE) gdrive) {
        super([gdrive, referral, main], { default: MAIN_SCENE });
    }
}
