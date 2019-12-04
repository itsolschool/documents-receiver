import { __ } from '../helpers/strings'
import { BaseScene } from 'telegraf'
import Team from '../models/Team'
import User from '../models/User'
import { SCENE } from '../const/sceneId'

const CANDIDATE_TEAM_ID = 'candidateTeamId'

const scene = new BaseScene(SCENE.REFERRAL_REGISTER)
scene
    .enter(async (ctx) => {
        let candidateTeam
        if (ctx.user) {
            candidateTeam = await ctx.user.team.$query().eager('members')
        } else {
            const teams = await Team.query()
                .where('inviteToken', ctx.message.text.slice(7))
                .limit(1)
                .eager('members')
            candidateTeam = teams[0]
        }

        if (!candidateTeam) {
            await ctx.reply(__('referral.wrongToken'))
            return
        }

        if (candidateTeam.capacity <= candidateTeam.members.length && !ctx.user) {
            await ctx.reply(__('referral.overcrowded', { team: candidateTeam.name, count: candidateTeam.capacity }))
            return
        }

        ctx.scene.state[CANDIDATE_TEAM_ID] = candidateTeam.$id()
        await ctx.reply(__('referral.greeting', { username: ctx.from.username, team: candidateTeam.name }))
    })
    .on('text', async (ctx) => {
        if (!ctx.message.text) {
            await ctx.reply(__('referral.doubt'))
            return
        }

        if (ctx.message.text.startsWith('/start')) {
            await ctx.scene.reenter()
            return
        }

        if (ctx.message.text.startsWith('/')) {
            await ctx.reply(__('referral.restricted'))
            return
        }

        let user = ctx.user
        if (!user) {
            user = await User.query()
                .insert({
                    tgId: ctx.from.id,
                    fullName: ctx.message.text,
                    teamId: ctx.scene.state[CANDIDATE_TEAM_ID]
                })
                .eager('team')
        } else {
            user = await User.query()
                .patchAndFetchById(user.tgId, {
                    fullName: ctx.message.text
                })
                .eager('team')
        }

        await ctx.reply(
            __('referral.final', {
                team: user.team.name,
                name: user.fullName
            })
        )
        return ctx.scene.enter('main')
    })
export default scene
