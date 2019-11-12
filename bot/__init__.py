import logging
import os

import telebot

import api.gdrive as drive
import config
import bot.database as db
import bot.markups as mk


def enable_proxy(proxy):
    if proxy != '':
        os.environ['http_proxy'] = proxy
        os.environ['HTTP_PROXY'] = proxy
        os.environ['https_proxy'] = proxy
        os.environ['HTTPS_PROXY'] = proxy


enable_proxy(config.proxy)
bot = telebot.TeleBot(config.telegram_token)
logging.basicConfig(filename="bot.log",
                    format='%(asctime)s: %(levelname)s - %(module)s - %(funcName)s - %(lineno)d - %(message)s',
                    level=logging.INFO)
logging.info("BOT STARTED")


def getUserInfo(message):
    answer = "Telegram id: " + str(message.chat.id) + \
             " Username: @" + str(message.from_user.username) + \
             " First name: " + str(message.from_user.first_name) + \
             " Last name: " + str(message.from_user.last_name) + " "
    return answer


# Декоратор проверки существования пользователя
def checkUser(function):
    def the_wrapper_around_the_original_function(message):
        user = db.User.getUserById(message.chat.id)
        if user != None:
            function(message=message, user=user)
        else:
            registration(message)

    return the_wrapper_around_the_original_function


def getReplyMarkup(number):
    markup = telebot.types.ReplyKeyboardMarkup()
    markup.add(*[str(i) for i in range(number)])
    return markup


# Функция создания красивого сообщения - списка из листа команд
def teamsToMessage(teams):
    answ = ""
    markup = telebot.types.ReplyKeyboardMarkup()
    for i in range(len(teams)):
        answ += "*" + str(i) + "*. " + teams[i].name + ": " + \
                tokenToLink(teams[i].token) + " У: " + \
                str(len(teams[i].getUsersList())) + "\n"
    return answ, markup


def teamsToMessageDocs(teams):
    answ = ""
    for i in range(len(teams)):
        answ += "*" + str(i) + "*. " + teams[i].name + ": " + \
                str(len(teams[i].getNewDocs())) + "\n"
    return answ


# Функция создания красивого сообщения - списка из листа юзеров
def usersToMessage(users):
    answ = ""
    for i in range(len(users)):
        answ += "*" + str(i) + "*. " + users[i].first_name + " " + \
                users[i].last_name + " - @" + \
                users[i].username + "\n"
    return answ


def listToMessage(list):
    message = ""
    for i in range(len(list)):
        message += "*" + str(i) + "*. " + list[i] + "\n"
    return message


def docsToMessage(docs):
    status = {-1: "отклонен".upper(),
              0: "еще не проверен".upper(),
              1: "принят".upper()}
    if len(docs) == 0:
        return "Ваша команда еще не отправляла документы"

    answ = ""
    for doc in docs:
        answ += "'" + doc.type + "' - " + status[doc.status] + " - " + doc.sender + "\n\n"
    return answ


def tokenToLink(token):
    return "t.me/" + eval(str(bot.get_me())).get('username') + "?start=" + str(token)


def registration(message):
    # Потыкал ссылки вида t.me/abcdbot?start=123 и просто увидел что код идет с 7 символа
    team = db.Team.getTeam(message.text[7:])
    if team != None and team.balance > 0:
        bot.send_message(message.chat.id, "Ваша ссылка верна, команда '" + team.name + "'")
        bot.send_message(message.chat.id, "Введите ваше имя")
        bot.register_next_step_handler(message=message, callback=getName, team=team)
    else:
        bot.send_message(message.chat.id, "Ваша ссылка недействительна")
    logging.info(getUserInfo(message) + " started registration")


def getName(message, team):
    bot.send_message(message.chat.id, "Введите вашу фамилию")
    bot.register_next_step_handler(message=message, callback=getSurname, name=message.text, team=team)


def getSurname(message, team, name):
    try:
        db.Team.get_by_id(team.get_id())
        db.User.add(tg_id=message.chat.id,
                    username=message.from_user.username,
                    first_name=name.title(),
                    last_name=message.text.title(),
                    team=team)
        team.balance -= 1
        team.save()
        help(message)
        start(message)
    except:
        bot.clear_step_handler_by_chat_id(message.chat.id)
        bot.send_message(message.chat.id, "Что-то пошло не так, перейдите по вашей ссылке снова")
    else:
        bot.send_message(message.chat.id, "Теперь вы участник команды '" + team.name + "'")


@bot.message_handler(commands=['start'])
@checkUser
def start(message, user):
    if user.team.name == config.org_team_name:
        bot.send_message(message.chat.id,
                         "Добрый день, " + user.first_name + " " + user.last_name + "\nВаш статус - организатор",
                         reply_markup=mk.main_admin)
    else:
        bot.send_message(message.chat.id,
                         "Добрый день, " + user.first_name + " " + user.last_name + "\nВаша команда - " + user.team.name,
                         reply_markup=mk.main_user)
    logging.info(getUserInfo(message) + "started using bot")


@bot.message_handler(commands=['main'])
@checkUser
def main_menu(message, user):
    if user.team.name == config.org_team_name:
        bot.send_message(message.chat.id, "Главное меню", reply_markup=mk.main_admin)
    else:
        bot.send_message(message.chat.id, "Главное меню", reply_markup=mk.main_user)


@bot.message_handler(commands=['add_team'])
@checkUser
def add_team(message, user):
    logging.info(getUserInfo(message) + " started creating a team")
    if user.team.name == config.org_team_name:
        bot.send_message(message.chat.id, "Регистрация команды")
        bot.send_message(message.chat.id, "Укажите название команды:", reply_markup=mk.back)
        bot.register_next_step_handler(message, getTeamName)


def getTeamName(message):
    if message.text == "назад":
        main_menu(message)
    elif not db.Team.select().where(db.Team.name == message.text).exists():
        bot.send_message(message.chat.id, "Укажите название школы:")
        bot.register_next_step_handler(message=message, callback=getSchool, name=message.text)
    else:
        bot.send_message(message.chat.id, "Команда с таким названием уже существует.\nИспользуйте другое название")
        bot.register_next_step_handler(message, getTeamName)


def getSchool(message, name):
    if message.text == "назад":
        main_menu(message)
    else:
        team = db.Team.add(name=name, school=message.text)
        logging.info(getUserInfo(message) + " created a new team '" + team.name + "'")
        bot.send_message(message.chat.id, "Ссылка доступа для этой команды: ", reply_markup=mk.main_admin)
        bot.send_message(message.chat.id, tokenToLink(team.token))
        bot.send_message(message.chat.id,
                         "Отправьте эту ссылку всем участникам команды '" +
                         team.name + "', чтобы они могли получить доступ\n(эта ссылка может добавить 7 участников)")


@bot.message_handler(commands=['editTeam'])
@checkUser
def edit_team_menu(message, user):
    if user.team.name == config.org_team_name:
        teams = db.Team.getTeamsList()
        bot.send_message(message.chat.id, "Вот список команд на данный момент:")
        bot.send_message(message.chat.id, teamsToMessage(teams), parse_mode='Markdown')
        bot.send_message(message.chat.id, "Нажмите на номер команды, которую вы хотите изменить",
                         reply_markup=getReplyMarkup(len(teams)).row("назад"))
        bot.register_next_step_handler(message=message, callback=chooseTeam, teams=teams)


def chooseTeam(message, teams):
    try:
        answ = int(message.text)
    except ValueError:
        if message.text == "назад":
            main_menu(message)
        else:
            bot.send_message(message.chat.id, "Чтобы выбрать команду нужно указать только ее номер в списке")
            bot.register_next_step_handler(message=message, callback=chooseTeam, teams=teams)
    else:
        if len(teams) > answ >= 0:
            setTeam(message, teams[answ])
        else:
            bot.send_message(message.chat.id, "Такого варианта нет в списке, попробуйте еще раз")
            bot.register_next_step_handler(message=message, callback=chooseTeam, teams=teams)


def setTeam(message, team):
    bot.send_message(message.chat.id, "Команда '" + team.name + "'")
    users = team.getUsersList()
    bot.send_message(message.chat.id, "Список участников команды '" + team.name + "'",
                     reply_markup=mk.team_edit)
    if len(users) > 0:
        bot.send_message(message.chat.id, usersToMessage(users), parse_mode='Markdown')
    else:
        bot.send_message(message.chat.id, "Команда пуста".upper())
    bot.register_next_step_handler(message=message, callback=editTeam, team=team)


def editTeam(message, team):
    if message.text == 'Добавить участника':
        addTeamMember(message, team)
    elif message.text == 'Удалить участника':
        users = team.getUsersList()
        if team.name == config.org_team_name and len(users) == 1:
            bot.send_message(message.chat.id, "В команде организаторов должен быть хотя бы один человек")
            setTeam(message, team)
        elif len(users) > 0:
            bot.send_message(message.chat.id, "Удаление участника")
            bot.send_message(message.chat.id, "Выберите участника нажав на его номер:")
            bot.send_message(message.chat.id, usersToMessage(users),
                             reply_markup=getReplyMarkup(len(users)).row('назад'),
                             parse_mode='Markdown')
            bot.register_next_step_handler(message=message, callback=deleteTeamMember, users=users, team=team)
        else:
            bot.send_message(message.chat.id, "Команда пуста".upper())
            setTeam(message, team)
    elif message.text == 'Изменить название':
        if team.name != config.org_team_name:
            bot.send_message(message.chat.id, "Введите новое название команды '" + team.name + "'")
            bot.register_next_step_handler(message=message, callback=changeTeamName, team=team)
        else:
            bot.send_message(message.chat.id, "Изменение названия команды организаторов запрещено")
            setTeam(message, team)
    elif message.text == 'Удалить команду':
        if team.name != config.org_team_name:
            bot.send_message(message.chat.id, "Удаление команды")
            team.remove(bot)
            edit_team_menu(message)
        else:
            bot.send_message(message.chat.id, "Удаление команды организаторов невозможно")
            setTeam(message, team)
    elif message.text == "Разослать сообщение всей команде":
        bot.send_message(message.chat.id, "Отправьте сообщение, которое вы хотите разослать:",
                         reply_markup=mk.back)
        bot.register_next_step_handler(message=message,
                                       callback=sendAll,
                                       user=db.User.getUserById(message.chat.id),
                                       team=team)
    elif message.text == "назад":
        edit_team_menu(message)
    elif message.text == 'главное меню':
        main_menu(message)
    else:
        bot.register_next_step_handler(message=message, callback=editTeam, team=team)


def changeTeamName(message, team):
    if team.rename(message.text):
        bot.send_message(message.chat.id, "Новое название - " + message.text)
        setTeam(message, team)
    else:
        bot.send_message(message.chat.id, "Это название уже используется другой командой")
        setTeam(message, team)


def deleteTeamMember(message, users, team):
    try:
        answ = int(message.text)
    except ValueError:
        if message.text == "назад":
            edit_team_menu(message)
        else:
            bot.send_message(message.chat.id, "Чтобы выбрать участника нужно указать только его номер в списке")
            bot.register_next_step_handler(message=message, callback=deleteTeamMember, users=users)
    else:
        if len(users) > answ >= 0:
            user = users[answ]
            bot.send_message(message.chat.id, "Вы удалили " + user.first_name +
                             " " + user.last_name +
                             " @" + user.username)
            user.remove(bot)
            setTeam(message, team)
        else:
            bot.send_message(message.chat.id, "Такого варианта нет в списке, попробуйте еще раз")
            bot.register_next_step_handler(message=message, callback=deleteTeamMember, users=users, team=team)


def addTeamMember(message, team):
    bot.send_message(message.chat.id, "Ссылка для нового участника:")
    bot.send_message(message.chat.id, tokenToLink(team.addTeamMember()))
    setTeam(message, team)


@bot.message_handler(commands=['exit'])
@checkUser
def exit(message, user):
    bot.send_message(message.chat.id, 'Команда отключена :(\nОбратитесь к администратору, чтобы выйти из команды.')
    return

    # noinspection PyUnreachableCode
    bot.send_message(message.chat.id, "Вы вышли из команды '" + user.team.name + "'")
    bot.send_message(message.chat.id, "У вас больше нет доступа к боту",
                     reply_markup=telebot.types.ReplyKeyboardRemove())
    user.delete_instance()

    # Проверка на случай если организаторов нет, в таком случае бот нужно перезапустить, чтобы добавить по умолчанию
    if len(db.Team.get(db.Team.name == config.org_team_name).getUsersList()) < 1:
        logging.fatal("Admins team is empty")
        logging.fatal("Shutdown bot".upper())

        bot.stop_bot()


@bot.message_handler(commands=['sendDoc'])
@checkUser
def sendDocMenu(message, user):
    if user.team.name != config.org_team_name:
        bot.send_message(message.chat.id, "Укажите номер документа, которой вы хотите отправить:",
                         reply_markup=getReplyMarkup(len(config.docs)).row('назад'))
        bot.send_message(message.chat.id, listToMessage(config.docs), parse_mode='Markdown')
        bot.register_next_step_handler(message=message, callback=setDoc, user=user)


def setDoc(message, user):
    try:
        answ = int(message.text)
    except ValueError:
        if message.text == "назад":
            main_menu(message)
        else:
            bot.send_message(message.chat.id, "Чтобы выбрать документ нужно указать только его номер в списке")
            bot.register_next_step_handler(message=message, callback=setDoc, user=user)
    else:
        if len(config.docs) > answ >= 0:
            bot.send_message(message.chat.id, "Отправьте ссылку на ваш файл, лежащий на гугл диске")
            bot.register_next_step_handler(message=message, callback=getDoc, docName=config.docs[answ], user=user)
        else:
            bot.send_message(message.chat.id, "Такого варианта нет в списке, попробуйте еще раз")
            bot.register_next_step_handler(message=message, callback=setDoc, user=user)


def getDoc(message, docName, user):
    try:
        if message.text == "назад":
            sendDocMenu(message)
        elif drive.isValidLink(message.text):
            # Проверка на тип ссылки, так как по этой нельзя получить файл
            if message.text.find('open?id=') != -1:
                bot.send_message(message.chat.id, "Неверная ссылка доступа.\n"
                                                  "Чтобы получить верную нажмите правой кнопкой мыши по файлу и выберете "
                                                  "'Открыть доступ', после чего нажмите на 'копировать ссылку общего доступа'")
                raise Exception
            else:
                db.Document.add(type=docName, link=message.text, team=user.team,
                                sender=user.first_name + " " + user.last_name)
                bot.send_message(message.chat.id, "Ваш документ был успешно отправлен на проверку")
                main_menu(message)
        else:
            bot.send_message(message.chat.id, "Неправильная ссылка, попробуйте еще раз")
            raise Exception
    except:
        bot.register_next_step_handler(message=message, callback=getDoc, docName=docName, user=user)


@bot.message_handler(commands=['checkDocs'])
@checkUser
def checkDocsMenu(message, user):
    if user.team.name == config.org_team_name:
        teams = db.Team.getTeamsDocuments()
        if len(teams) > 0:
            bot.send_message(message.chat.id, "Выберите номер команды, чьи документы вы хотите проверить:")
            bot.send_message(message.chat.id, teamsToMessageDocs(teams),
                             reply_markup=getReplyMarkup(len(teams)).row('назад'), parse_mode='Markdown')
            bot.register_next_step_handler(message=message, callback=setTeamDocs, teams=teams)
        else:
            bot.send_message(message.chat.id, "Документы всех команд проверены")
            main_menu(message)


def setTeamDocs(message, teams):
    try:
        answ = int(message.text)
    except ValueError:
        if message.text == "назад":
            main_menu(message)
        else:
            bot.send_message(message.chat.id, "Чтобы выбрать команду нужно указать только ее номер в списке")
            bot.register_next_step_handler(message=message, callback=setTeamDocs, teams=teams)
    else:
        if len(teams) > answ >= 0:
            setDocument(message=message, document=teams[answ].getDoc(0), team=teams[answ], number=0)
        else:
            bot.send_message(message.chat.id, "Такого варианта нет в списке, попробуйте еще раз")
            bot.register_next_step_handler(message=message, callback=setTeamDocs, teams=teams)


def setDocument(message, document, team, number):
    if document != None:
        bot.send_message(message.chat.id, document.name + " команды '" + team.name + "'",
                         reply_markup=mk.verifyDocument)
        bot.send_message(message.chat.id, drive.getFileLink(document.fileId))
        bot.register_next_step_handler(message=message, callback=verifyDocument, document=document, team=team,
                                       number=number)
    else:
        bot.send_message(message.chat.id, "Все документы этой команды уже проверены")
        checkDocsMenu(message)


def verifyDocument(message, document, team, number):
    if message.text == 'Подтвердить':
        bot.send_message(message.chat.id, 'Вы хотите добавить комментарий к документу?',
                         reply_markup=mk.addMessage)
        bot.register_next_step_handler(message=message, callback=addMessage, document=document, team=team, accept=True)
    elif message.text == 'Отклонить':
        bot.send_message(message.chat.id, 'Вы хотите добавить комментарий к документу?',
                         reply_markup=mk.addMessage)
        bot.register_next_step_handler(message=message, callback=addMessage, document=document, team=team, accept=False)
    elif message.text == 'Следующий документ':
        setDocument(message=message, document=team.getDoc(number + 1), team=team, number=number + 1)
    elif message.text == 'Назад':
        checkDocsMenu(message)
    elif message.text == 'Главное меню':
        main_menu(message)


def addMessage(message, document, team, accept):
    if message.text == "Да":
        bot.send_message(message.chat.id, "Введите комментарий для отправки команде",
                         reply_markup=telebot.types.ReplyKeyboardRemove())
        bot.register_next_step_handler(message=message, callback=getDocumentMessage, document=document, accept=accept)
    else:
        if accept:
            document.accept(bot)
            bot.send_message(message.chat.id, document.name + " команды " + document.team.name + " был принят")
        else:
            document.reject(bot)
            bot.send_message(message.chat.id, document.name + " команды " + document.team.name + " был отклонен")
        setDocument(message=message, document=team.getDoc(0), team=team, number=0)


def getDocumentMessage(message, document, accept):
    if accept:
        document.accept(bot)
    else:
        document.reject(bot)
    document.team.sendAll("Комментарий к документу '" + document.name + "':\n\n" + message.text, bot)
    bot.send_message(message.chat.id, "Ваш комментарий был отправлен команде")
    setDocument(message=message, document=document.team.getDoc(0), team=document.team, number=0)


@bot.message_handler(commands=['getTeamInfo'])
@checkUser
def getTeamInfo(message, user):
    if user.team.name != config.org_team_name:
        bot.send_message(message.chat.id, "Список участников команды '" + user.team.name + "'")
        bot.send_message(message.chat.id, usersToMessage(user.team.getUsersList()), parse_mode='Markdown')
        bot.send_message(message.chat.id, "Отправленные документы вашей команды:")
        bot.send_message(message.chat.id, docsToMessage(user.team.getDocs()))


@bot.message_handler(commands=['help'])
@checkUser
def help(message, user):
    if user.team.name != config.org_team_name:
        bot.send_message(message.chat.id,
                         "/sendDoc - Отправить документ на проверку\n\n" +
                         "/getTeamInfo - Получить список своей команды и информацию об отправленных документах\n\n" +
                         "/help - Получить инструкцию")
    else:
        bot.send_message(message.chat.id,
                         "/add_team - Создать новую команду\n\n" +
                         "/editTeam - Управление командами\n\n" +
                         "/checkDocs - Проверка документов, присланых командами\n\n" +
                         "/sendAll - Отправить сообщение всем участникам\n\n"
                         "/exit - Выход из команды организаторов(вы не сможете вернуться самостоятельно)\n\n" +
                         "/help - Получить инструкцию")


@bot.message_handler(commands=['sendAll'])
@checkUser
def getMessage(message, user):
    if user.team.name == config.org_team_name:
        bot.send_message(message.chat.id, "Отправьте сообщение, которое вы хотите разослать:",
                         reply_markup=mk.back)
        bot.register_next_step_handler(message=message, callback=sendAll, user=user)


def sendAll(message, user, team=None):
    if team == None:
        if message.text == "назад":
            main_menu(message)
        else:
            for team in db.Team.select():
                if team.name != config.org_team_name:
                    team.sendAll("Сообщение от " + user.first_name + " " + user.last_name + ": " + message.text, bot)
            bot.send_message(message.chat.id, "Сообщение '" + message.text + "' было отправлено всем участникам")
            main_menu(message)
    else:
        if message.text == "назад":
            setTeam(message, team)
        else:
            team.sendAll("Сообщение от " + user.first_name + " " + user.last_name + ": " + message.text, bot, user)
            bot.send_message(message.chat.id, "Сообщение '" + message.text + "' было отправлено всем участникам '" +
                             team.name + "'")
            setTeam(message, team)


@bot.message_handler(content_types=['text'])
def redirect(message):
    main_menu(message)


bot.enable_save_next_step_handlers(delay=1)
bot.load_next_step_handlers()
if __name__ == "__main__":
    bot.polling(none_stop=True)
