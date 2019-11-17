// Dependencies
import { bot } from './helpers/bot';
import { setupSession } from './helpers/session';
import Knex from 'knex';
import { Model } from 'objection';
import setupStageAndStart from './helpers/stage';
import Team from './models/Team';
import attachUser from './middlewares/attachUser';


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
    setupSession(bot);
    setupStageAndStart(bot);

    bot.startPolling();
}

async function setupFirstTeam() {
    let team = await Team.query().findById(1);

    if (!team) {
        console.log('No orgs team. Adding one...');
        team = new Team();
        team.setNewInviteToken();
        team.schoolName = 'croc';
        team.name = 'Ораганизаторы';

        await Team.query().insert(team);
    }

    console.log(`Orgs team invite link: t.me/itss_docs_bot?start=${team.inviteToken}`);
}

Promise.resolve()
    .then(setupDb)
    .then(setupBot)
    .then(setupFirstTeam)
    .catch(console.error);
