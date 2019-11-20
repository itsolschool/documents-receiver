import Knex from 'knex';
import { Model } from 'objection';
import attachUser from './middlewares/attachUser';

import { bot } from './helpers/bot';
import { setupRedisSession } from './helpers/redisSession';
import Team from './models/Team';
import { setupStage } from './helpers/stage';
import { Stage } from 'telegraf';
import { setupGDrive } from './helpers/gdrive';
import * as fs from 'fs';
import { setupTrello } from './helpers/trello';


async function setupDb() {
    const knex = Knex({
        ...require('../knexfile.js')[process.env.NODE_ENV || 'development']
    });
    Model.knex(knex);
    console.log('Migrating...');
    await knex.migrate.latest();
}

async function setupBot() {
    bot.catch(console.log);

    bot.use(attachUser);


    setupRedisSession(bot, process.env.REDIS_URL);
    await setupGDrive(bot, JSON.parse(fs.readFileSync('client_secret.json', 'utf8')));
    await setupTrello(bot);

    setupStage(bot);

    bot.command('start', Stage.enter('referral'));


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
