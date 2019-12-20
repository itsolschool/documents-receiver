import { WizardScene } from '../helpers/wizard'
import { __ } from '../helpers/strings'
import Telegraf, { Composer, ContextMessageUpdate, Markup, Middleware } from 'telegraf'
import Team from '../models/Team'
import { GREEN_MARK, RED_CROSS, WHITE_QUESTION_MARK } from '../const/emojies'
import promiseListener from '../helpers/promiseListener'
import { SCENE } from '../const/sceneId'

function onlyText(cb: Middleware<ContextMessageUpdate>): Middleware<ContextMessageUpdate> {
    return (ctx, next) => {
        if (ctx.message.text?.length > 1 && !ctx.message.text.startsWith('/')) {
            return cb(ctx, next)
        }
        ctx.reply(__('errors.notText'))
        return next
    }
}

const confirmStep = new Composer()
    .hears(__('addTeam.confirmYes'), async (ctx, next) => {
        ctx.wizard.next()
        ctx.wizard.step(ctx, next)
    })
    .hears(__('addTeam.confirmNo'), async (ctx) => {
        await ctx.reply(__('addTeam.retry'))
        ctx.wizard.selectStep(0)
        return ctx.scene.reenter() // сразу обрабатываем имя
    })

const scene = new WizardScene(
    SCENE.TEAM_ADD,
    { cancelable: true },
    onlyText(async (ctx, next) => {
        ctx.wizard.state['teamName'] = ctx.message.text
        if (
            await Team.query()
                .where('name', ctx.message.text)
                .first()
        ) {
            return ctx.reply(__('addTeam.nameNotUniq'))
        }
        ctx.wizard.next()
        await ctx.reply(__('addTeam.askSchool'))
        return next()
    }),
    onlyText(async (ctx, next) => {
        ctx.wizard.state['teamSchool'] = ctx.message.text

        const team = {
            school: ctx.wizard.state['teamSchool'],
            name: ctx.wizard.state['teamName']
        }
        await ctx.replyWithHTML(
            __('addTeam.confirm__html', team),
            Markup.keyboard([Markup.button(__('addTeam.confirmYes')), Markup.button(__('addTeam.confirmNo'))])
                .resize()
                .oneTime()
                .extra()
        )
        ctx.wizard.next()
    }),
    confirmStep,
    async (ctx) => {
        const team = await Team.query().insertAndFetch({
            name: ctx.wizard.state['teamName'],
            schoolName: ctx.wizard.state['teamSchool']
        })

        await Promise.all([sendInviteLink(ctx, team), showServiceBindingProgress(ctx, team)])
        return ctx.scene.leave()
    }
).enter(Telegraf.reply(__('addTeam.askName')))

function getMarkByState(state: Error | boolean) {
    if (state instanceof Error) return RED_CROSS
    if (state) return GREEN_MARK
    return WHITE_QUESTION_MARK
}

async function showServiceBindingProgress(ctx: ContextMessageUpdate, team: Team): Promise<void> {
    const message = await ctx.reply(
        __('addTeam.result', {
            trello: getMarkByState(null),
            gdrive: getMarkByState(null)
        })
    )

    const gdrivePromise = ctx.gdrive.createFolderForTeam(team).then(()=>true)
    const trelloPromise = ctx.trello.createCardForTeam(team).then(()=>true)

    const callback = async ([gdrive, trello]) => {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            message.message_id,
            void 0,
            __('addTeam.result', {
                trello: getMarkByState(trello),
                gdrive: getMarkByState(gdrive),
                errors: [gdrive, trello]
                    .filter((a) => a instanceof Error)
                    .map(String)
                    .join('\n\n')
            })
        )
    }
    /// очень важно не профукать расположение промисов. тут TS выключен
    await promiseListener<any>(callback, [gdrivePromise, trelloPromise])
}

async function sendInviteLink(ctx: ContextMessageUpdate, team: Team) {
    team.setNewInviteToken()
    await Team.query()
        .findById(team.$id())
        .patch({ inviteToken: team.inviteToken })

    const link = `https://t.me/${ctx.me}?start=${team.inviteToken}`
    await ctx.reply(__('addTeam.link', { link }))
}

export default scene
