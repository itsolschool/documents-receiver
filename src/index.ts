import Knex from 'knex';
import { Model } from 'objection';
import attachUser from './middlewares/attachUser';

import { bot } from './helpers/bot';
import { bindRedisSession } from './helpers/redisSession';
import { setupStage } from './helpers/stage';
import { Stage } from 'telegraf';
import { bindGDrive } from './helpers/gdrive';
import * as fs from 'fs';
import { bindTrello } from './helpers/trello';
import * as path from 'path';
import afterStart from './helpers/afterStart';

const config = require(path.resolve(__dirname, '../config/general.json'));
const debug = require('debug')('bot');

async function setupDb() {
    const knex = Knex({
        ...require('../knexfile.js')[process.env.NODE_ENV || 'development']
    });
    Model.knex(knex);
    debug('Migration started...');
    await knex.migrate.latest();
    debug('Migration done');
}

async function setupBot() {
    bot.catch(console.log);


    bot.use(attachUser);

    const gdriveSecret = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/gdrive_client_secret.json'), 'utf8'));

    const redis = bindRedisSession(bot, process.env.REDIS_URL);
    const gdrive = await bindGDrive(bot, gdriveSecret);
    const trello = await bindTrello(bot);

    setupStage(bot);

    bot.command('start', Stage.enter('referral'));


    // TODO переделать на webhook'и
    bot.startPolling();
}

async function setupFirstTeam() {
    let team = await Team.query().findById(1);

    if (!team) {
        console.log('No orgs team. Adding one...');

        team = new Team();
        team.setNewInviteToken();
        team.schoolName = 'croc';
        team.name = 'Администраторы';
        team.isAdmin = true;

        await Team.query().insert(team);
    }

    console.log(`Orgs team invite link: https://t.me/itss_docs_bot?start=${team.inviteToken}`);
}

Promise.resolve()
    .then(setupDb)
    .then(setupFirstTeam)
    .then(setupBot)
    .catch(console.error);
