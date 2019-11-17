// Dependencies
import { bot } from './helpers/bot';
import { setupSession } from './helpers/session';
import Knex from 'knex';
import { Model } from 'objection';
import setupStageAndStart from './helpers/stage';
import Team from './models/Team';


async function setupDb() {
    const knex = Knex({
        ...require('../knexfile.js')[process.env.NODE_ENV || 'development']
    });
    Model.knex(knex);
    await knex.migrate.latest();
}

async function setupBot() {
    bot.catch(console.log);

    setupSession(bot);
    setupStageAndStart(bot);

    bot.startPolling();
}

async function setupFirstTeam() {
    const team = await Team.query().findById(1);

    console.log(`Orgs team invite link: t.me/itss_docs_bot?start=${team.inviteToken}`);
}

Promise.resolve()
    .then(setupDb)
    .then(setupBot)
    .then(setupFirstTeam)
    .catch(console.error);
