import { AsyncContainerModule, Container, ContainerModule } from 'inversify';
import Knex from 'knex';
import { Model } from 'objection';
import {
    BOT_SERVICE,
    DB_SERVICE,
    GDRIVE_PROVIDER,
    GDRIVE_SERVICE,
    REDIS_SERVICE,
    TRELLO_PROVIDER,
    TRELLO_SERVICE
} from '../constant/services';
import { GDRIVE_SETUP_SCENE, MAIN_SCENE, REFERRAL, STAGE } from '../constant/scenes';
import { MainScene } from '../scenes/main';
import { ReferralScene } from '../scenes/referral';
import { GDriveSetupScene } from '../scenes/gdrive';
import { BotStage } from '../helpers/stage';
import GDriveService from '../services/GDriveService';
import AppVar, { APP_GDRIVE_ACCESS_TOKEN, APP_TRELLO_TOKEN_KEY } from '../models/AppVar';
import { APP_VAR_PROVIDER } from '../constant/functions';
import TrelloService from '../services/TrelloService';
import { REDIS_SESSION } from '../constant/middlewares';
import TelegrafRedisSession from 'telegraf-session-redis';
import bluebird from 'bluebird';
import { RedisClient } from 'redis';
import { GDRIVE_CLIENT_SECRET, REDIS_URL } from '../config';
import { TelegrafBot } from '../helpers/bot';
import knexConfig from '../../knexfile';

type AppKeyFunction = (string) => Promise<string>;
const DBModule = new AsyncContainerModule(async (bind) => {
    const knex = Knex({
        ...knexConfig[process.env.NODE_ENV || 'development']
    });
    Model.knex(knex);
    console.log('Migrating...');
    await knex.migrate.latest();
    bind<Knex>(DB_SERVICE).toConstantValue(knex);

    bind<AppKeyFunction>(APP_VAR_PROVIDER).toProvider((context) => async (name) => {
        context.container.get(DB_SERVICE);
        return (await AppVar.query().findById(name)).value;
    });
});

const TelegrafModule = new ContainerModule((bind) => {
    bind<TelegrafBot>(BOT_SERVICE)
        .to(TelegrafBot)
        .inSingletonScope();
});

const RedisModule = new ContainerModule((bind) => {
    const rsession = new TelegrafRedisSession({
        // @ts-ignore -- because redis doesn't require host and port if url is specified
        store: {
            url: REDIS_URL
        }
    });
    bind<TelegrafRedisSession>(REDIS_SESSION).toConstantValue(rsession);

    const asyncRedis = bluebird.promisifyAll(rsession.client);

    bind<RedisClient>(REDIS_SERVICE).toConstantValue(asyncRedis);
});

const ExternalAPIServicesModule = new AsyncContainerModule(async (bind) => {
    type GDriveProvider = () => Promise<GDriveService>;

    bind<GDriveService>(GDRIVE_SERVICE)
        .to(GDriveService)
        .inSingletonScope();
    bind<GDriveProvider>(GDRIVE_PROVIDER).toProvider((context) => async () => {
        const gdriveInstance = context.container.get<GDriveService>(GDRIVE_SERVICE);
        gdriveInstance.setupAuth(GDRIVE_CLIENT_SECRET);

        const creds = await context.container.get<AppKeyFunction>(APP_VAR_PROVIDER)(APP_GDRIVE_ACCESS_TOKEN);
        gdriveInstance.setCredentials(JSON.parse(creds));
    });

    type TrelloProvider = () => Promise<TrelloService>;

    bind<TrelloService>(TRELLO_SERVICE)
        .to(TrelloService)
        .inSingletonScope();
    bind<TrelloProvider>(TRELLO_PROVIDER).toProvider((context) => async () => {
        const creds = await context.container.get<AppKeyFunction>(APP_VAR_PROVIDER)(APP_TRELLO_TOKEN_KEY);
        const trelloInstance = context.container.get<TrelloService>(TRELLO_SERVICE);

        trelloInstance.setCredentials(creds);
    });
});

const StageModule = new AsyncContainerModule(async (bind) => {
    bind<MainScene>(MAIN_SCENE)
        .to(MainScene)
        .inSingletonScope();
    bind<ReferralScene>(REFERRAL)
        .to(ReferralScene)
        .inSingletonScope();
    bind<GDriveSetupScene>(GDRIVE_SETUP_SCENE)
        .to(GDriveSetupScene)
        .inSingletonScope();
    bind<BotStage>(STAGE)
        .to(BotStage)
        .inSingletonScope();
});

export async function getContainer() {
    const container = new Container();
    await container.loadAsync(StageModule, ExternalAPIServicesModule, DBModule);
    container.load(RedisModule, TelegrafModule);

    return container;
}
