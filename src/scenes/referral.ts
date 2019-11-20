import { __ } from '../helpers/strings';
import { BaseScene, ContextMessageUpdate } from 'telegraf';
import Team from '../models/Team';
import User from '../models/User';
import { REFERRAL } from '../constant/scenes';
import provideSingleton from '../ioc/provideSingletone';
import { inject } from 'inversify';
import { DB_SERVICE } from '../constant/services';

@provideSingleton(REFERRAL)
export class ReferralScene extends BaseScene<ContextMessageUpdate> {
    constructor(@inject(DB_SERVICE) db) {
        super(REFERRAL);

        this.enter(this.userEnter);

        this.on('text', this.handleUserText);
    }

    userEnter = async (ctx) => {
        let candidateTeam;
        if (ctx.user) {
            candidateTeam = await ctx.user.team.$query().eager('members');
        } else {
            const teams = await Team.query()
                .where('inviteToken', ctx.message.text.slice(7))
                .limit(1)
                .eager('members');
            candidateTeam = teams[0];
        }

        if (!candidateTeam) {
            await ctx.reply(__('referral.wrongToken'));
            return;
        }

        if (candidateTeam.capacity <= candidateTeam.members.length && !ctx.user) {
            await ctx.reply(__('referral.overcrowded', { team: candidateTeam.name, count: candidateTeam.capacity }));
            return;
        }

        ctx.session.candidateTeamId = candidateTeam.$id();
        await ctx.reply(__('referral.greeting', { username: ctx.from.username, team: candidateTeam.name }));
    };

    handleUserText = async (ctx) => {
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

        let user = ctx.user;
        if (!user) {
            user = await User.query()
                .insert({
                    tgId: ctx.from.id,
                    fullName: ctx.message.text,
                    teamId: ctx.session.candidateTeamId
                })
                .eager('team');
        } else {
            user = await User.query()
                .patchAndFetchById(user.tgId, {
                    fullName: ctx.message.text
                })
                .eager('team');
        }

        await ctx.reply(
            __('referral.final', {
                team: user.team.name,
                name: user.fullName
            })
        );
        return ctx.scene.enter('main');
    };
}
