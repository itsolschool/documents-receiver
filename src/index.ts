import 'reflect-metadata';

import Team from './models/Team';
import { getContainer } from './ioc/container';
import { BOT_SERVICE } from './constant/services';
import { TelegrafBot } from './helpers/bot';


async function setupOrgsTeam() {
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

getContainer()
    .then((container) => {
        const bot = container.get<TelegrafBot>(BOT_SERVICE);

        bot.startPolling();
    })
    .catch(console.error);
