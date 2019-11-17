import { __ } from '../helpers/strings';
import { BaseScene } from 'telegraf';
import Team from '../models/Team';
import User from '../models/User';

// @ts-ignore
const scene = new BaseScene('referral');
scene
    .enter(async (ctx) => {
        const teams = await Team.query()
            .where('inviteToken', ctx.message.text.slice(7))
            .limit(1)
            .eager('members');
        const candidateTeam = teams[0];

        console.log(candidateTeam);

        if (!candidateTeam) {
            await ctx.reply(__('referral.wrongToken'));
            return;
        }

        if (candidateTeam.capacity <= candidateTeam.members.length) {
            await ctx.reply(__('referral.overcrowded', { team: candidateTeam.name, count: candidateTeam.capacity }));
            return;
        }

        ctx.session.candidateTeamId = candidateTeam.$id();
        await ctx.reply(__('referral.greeting', { username: ctx.from.username, team: candidateTeam.name }));
    })
    .on('text', async (ctx) => {
        if (!ctx.message.text) {
            await ctx.reply(__('referral.doubt'));
            return;
        }

        if (ctx.message.text.startsWith('/start')) {
            await ctx.scene.reenter();
            return;
        }

        if (ctx.message.text.startsWith('/')) {
            await ctx.reply(__('referral.restricted'));
            return;
        }

        console.log(ctx.session.candidateTeamId);

        let user = await User.query().insert({
            tgId: ctx.from.id,
            fullName: ctx.message.text,
            teamId: ctx.session.candidateTeamId
        });

        ctx.session.name = ctx.message.text;
        await ctx.reply(
            __('referral.final', {
                team: 'tester',
                name: user.fullName
            })
        );
        return ctx.scene.enter('main');
    });
export default scene;
