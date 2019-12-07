import Telegraf, { Composer, ContextMessageUpdate } from 'telegraf'
import { __ } from '../helpers/strings'
import Team from '../models/Team'
import User from '../models/User'

// @ts-ignore -- так как command не внесён в публичный .d.ts
const { compose, branch, optional, command } = Composer

const CANDIDATE_TEAM_ID = '__candidateTeamId'

export function setupReferralMiddleware(bot: Telegraf<ContextMessageUpdate>) {
    const middleware = compose([
        branch(
            (ctx) => !ctx.session[CANDIDATE_TEAM_ID],
            // если мы не нашли id кандидатной команды
            compose([
                command('start', async (ctx, next) => {
                    const token = ctx.message.text.slice(7)
                    const candidateTeam = await Team.query()
                        .where('inviteToken', token)
                        .eager('members')
                        .first()

                    if (!candidateTeam) return ctx.reply(__('referral.wrongToken'))

                    if (candidateTeam.capacity <= candidateTeam.members.length)
                        return ctx.reply(
                            __('referral.teamIsOvercrowded', {
                                team: candidateTeam.name,
                                count: candidateTeam.capacity.toString()
                            })
                        )

                    ctx.session[CANDIDATE_TEAM_ID] = candidateTeam.$id()

                    return ctx.reply(__('referral.askName', { team: candidateTeam.name }))
                }),

                Telegraf.reply(__('referral.referralRequired'))
            ]),
            // id команды есть. значит сейчас пользователь рассказывает своё имя
            async (ctx, next) => {
                const user = await User.query()
                    .insert({
                        tgId: ctx.from.id,
                        fullName: ctx.message.text,
                        teamId: ctx.session[CANDIDATE_TEAM_ID]
                    })
                    .eager('team')

                ctx.user = user

                await ctx.reply(
                    __('referral.final', {
                        team: user.team.name,
                        name: user.fullName
                    })
                )

                return next()
            }
        )
    ])

    bot.use(optional((ctx) => !ctx.user, middleware))
}
