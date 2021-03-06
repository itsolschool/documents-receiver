import { WizardScene } from '../helpers/wizard'
import phrases from '../helpers/strings'
import Telegraf, { Composer, ContextMessageUpdate, Markup, Middleware } from 'telegraf'
import Team from '../models/Team'
import { GREEN_MARK, RED_CROSS, WHITE_QUESTION_MARK } from '../const/emojies'
import promiseListener from '../helpers/promiseListener'
import { SCENE } from '../const/sceneId'
import { ExtraEditMessage } from 'telegraf/typings/telegram-types'

function onlyText(cb: Middleware<ContextMessageUpdate>): Middleware<ContextMessageUpdate> {
    return (ctx, next) => {
        if (ctx.message.text?.length > 1 && !ctx.message.text.startsWith('/')) {
            return cb(ctx, next)
        }
        ctx.reply(phrases.errors.notText())
        return next
    }
}

const confirmStep = new Composer()
    .hears(phrases.addTeam.confirmYes(), async (ctx, next) => {
        ctx.wizard.next()
        ctx.wizard.step(ctx, next)
    })
    .hears(phrases.addTeam.confirmNo(), async (ctx) => {
        await ctx.reply(phrases.addTeam.retry())
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
            return ctx.reply(phrases.addTeam.nameNotUniq())
        }
        ctx.wizard.next()
        await ctx.reply(phrases.addTeam.askSchool())
        return next()
    }),
    onlyText(async (ctx, next) => {
        ctx.wizard.state['teamSchool'] = ctx.message.text

        const team = {
            school: ctx.wizard.state['teamSchool'],
            name: ctx.wizard.state['teamName']
        }
        await ctx.replyWithHTML(
            phrases.addTeam.confirm__html(team),
            Markup.keyboard([[Markup.button(phrases.addTeam.confirmYes()), Markup.button(phrases.addTeam.confirmNo())]])
                .resize()
                .oneTime()
                .extra()
        )
        ctx.wizard.next()
    }),
    confirmStep,
    async (ctx) => {
        try {
            const team = await Team.query().insertAndFetch({
                name: ctx.wizard.state['teamName'],
                schoolName: ctx.wizard.state['teamSchool']
            })

            await Promise.all([sendInviteLink(ctx, team), showServiceBindingProgress(ctx, team)])
        } catch (e) {
            // TODO возможно стоит удалять неудавшуюся команду и все связные с ней ресурсы
            await ctx.scene.leave()
            throw e
        }
        return ctx.scene.enter(SCENE.MAIN)
    }
).enter(Telegraf.reply(phrases.addTeam.askName()))

function getMarkByState(state: Error | boolean) {
    if (state instanceof Error) return RED_CROSS
    if (state) return GREEN_MARK
    return WHITE_QUESTION_MARK
}

async function showServiceBindingProgress(ctx: ContextMessageUpdate, team: Team): Promise<void> {
    const message = await ctx.reply(
        phrases.addTeam.result({
            trello: getMarkByState(null),
            gdrive: getMarkByState(null)
        })
    )

    const gdrivePromise = ctx.gdrive.createFolderForTeam(team).then(() => true)
    const trelloPromise = ctx.trello.createCardForTeam(team).then(() => true)

    const callback = async ([gdrive, trello]) => {
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            message.message_id,
            void 0,
            phrases.addTeam.result({
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
    const botInfo = await ctx.telegram.getMe()

    const link = `https://t.me/${botInfo.username}?start=${team.inviteToken}`

    // @ts-ignore -- потому что removeKeyboard должен принимать boolean, а не строку
    const removeMarkup = Markup.removeKeyboard(true).extra()
    await ctx.reply(phrases.addTeam.link({ link }), removeMarkup as ExtraEditMessage)
}

export default scene
