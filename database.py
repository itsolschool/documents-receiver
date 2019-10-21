import logging
from random import randint
from threading import Thread

from peewee import *
from telebot import types
from urllib3.util import parse_url

import apidrive as drive
import apigithub as git
import apitrello as trello
import config


def get_database():
    parsed_url = parse_url(config.db_url)

    # Берём из auth имя пользователя и пароль от БД
    username, password = parsed_url.auth.split(':')

    return PostgresqlDatabase(
        parsed_url.path[1:],  # Пропускаем первый "/", так как он не является названием БД
        host=parsed_url.host,
        user=username,
        password=password
    )


db = get_database()
token_lenght = 10


class Team(Model):
    name = CharField(unique=True)
    token = CharField(unique=True)
    balance = IntegerField()
    school = CharField(null=True)
    trelloCard = CharField(null=True)
    driveFolder = CharField(null=True)
    gitRepo = CharField(null=True)

    class Meta:
        database = db

    @staticmethod
    def getTeam(token):
        if Team.select().where(Team.token == token).exists():
            return Team.get(Team.token == token)
        else:
            return None

    @staticmethod
    def genToken():
        token = ""
        for i in range(token_lenght):
            token += str(randint(0, 9))

        # Для случая, когда такой токен уже существует
        if Team.select().where(Team.token == token).exists():
            return Team.genToken()
        return token

    @staticmethod
    def add(name, school, balance=5):
        team = Team.create(name=name,
                           school=school.title(),
                           token=Team.genToken(),
                           balance=balance)
        Thread(target=trello.createCard, args=[team]).start()
        Thread(target=git.createRepo, args=[team]).start()
        Thread(target=drive.createFolder, args=[team]).start()
        return team

    # Создание словаря c командами
    @staticmethod
    def getTeamsList():
        list = []
        for team in Team.select():
            list.append(team)
        return list

    @staticmethod
    def getTeamsDocuments():
        teams = []
        for team in Team.select():
            if len(team.getNewDocs()) > 0:
                teams.append(team)
        return teams

    def getDoc(self, number):
        try:
            documents = self.getNewDocs()
            return documents[number % len(documents)]
        except:
            return None

    def getNewDocs(self):
        if Document.select().where((Document.team == self) & (Document.status == 0)).exists():
            return Document.select().where((Document.team == self) & (Document.status == 0))
        else:
            return []

    def getDocs(self):
        if Document.select().where(Document.team == self).exists():
            return Document.select().where(Document.team == self)
        else:
            return []

    def remove(self, bot):
        if User.select().where(User.team == self).exists():
            for user in User.select().where(User.team == self):
                user.remove(bot)

        if Document.select().where(Document.team == self).exists():
            for document in Document.select().where(Document.team == self):
                document.delete_instance()

        self.delete_instance()

    def getUsersList(self):
        if User.select().where(User.team == self).exists():
            return User.select().where(User.team == self)
        else:
            return []

    def addTeamMember(self):
        token = self.token
        self.balance += 1
        self.save()
        return token

    def rename(self, newName):
        if not Team.select().where(Team.name == newName).exists():
            self.gitRepo = git.changeName(self, newName)

            # Так как здесь меняется только название, изменять запись в бд не нужно, id все тот же
            drive.changeFolderName(self, newName)
            trello.changeCardName(self, newName)

            self.name = newName
            self.save()
            return True
        else:
            return False

    def sendAll(self, message, bot, userExcept=None):
        for user in User.select().where(User.team == self):
            if user != userExcept:
                bot.send_message(user.tg_id, message)


Team.create_table()

# Создание команды организаторов
if not Team.select().where(Team.name == config.org_team_name).exists():
    team = Team.create(name=config.org_team_name, token=Team.genToken(), balance=config.org_team_capacity)


# # team = Team.get(Team.name == config.main_name)
# print(Team.get_by_id(1).name)


class User(Model):
    tg_id = IntegerField(primary_key=True)
    username = CharField()
    first_name = CharField()
    last_name = CharField()
    team = ForeignKeyField(Team)

    class Meta:
        database = db
        table_name = 'bot_user'

    @staticmethod
    def add(tg_id, username, first_name, last_name, team):
        user = User.create(tg_id=tg_id, username=username, first_name=first_name, last_name=last_name, team=team)
        return user

    @staticmethod
    def getUserById(tg_id):
        if User.select().where(User.tg_id == tg_id).exists():
            return User.get(User.tg_id == tg_id)
        else:
            return None

    def remove(self, bot):
        bot.send_message(self.tg_id, "Вы были исключены из школы It решений.\nТеперь у вас нет доступа к боту",
                         reply_markup=types.ReplyKeyboardRemove())
        bot.clear_step_handler_by_chat_id(self.tg_id)
        self.delete_instance()


User.create_table()

# Добавление админа при запуске бота
if not User.select().where(User.tg_id == config.tg_id).exists():
    logging.info('create user', tg_id=config.tg_id,
                 username=config.tg_username,
                 first_name=config.firstname,
                 last_name=config.lastname)
    User.add(tg_id=config.tg_id,
             username=config.tg_username,
             first_name=config.firstname,
             last_name=config.lastname,
             team=Team.get(Team.name == config.org_team_name))


class Document(Model):
    name = CharField()
    fileId = CharField(null=True)
    team = ForeignKeyField(Team)
    sender = CharField()
    status = IntegerField(default=0)
    type = CharField()

    # status == 0 - не проверен
    # status == 1 - принят
    # status == - 1 - отклонен

    class Meta:
        database = db

    @staticmethod
    def add(type, link, team, sender):
        name = type + "_" + \
               team.name + "_v" + \
               str(len(Document.select().where((Document.team == team) & (Document.type == type))) + 1)
        document = Document.create(name=name, team=team, sender=sender, type=type)
        # if drive.isFolder(link):
        #     def uploadFolder():
        #         fileId = drive.copyFolderToDrive(folderId=drive.getFolderId(link),
        #                                          copy_name=name,
        #                                          parent=drive.getFolder(team))
        #         drive.uploadFolderToGithub(folderId=fileId, name=name, team=team)
        #         document.fileId = fileId
        #         document.save()
        #
        #     Thread(target=uploadFolder).start()
        # else:
        #     def uploadFile():
        #         fileId = drive.getFileId(link)
        #         file = drive.CopyToDrive(copy_name=name, fileId=fileId, parent=drive.getFolder(team))
        #         fileDict = drive.getFile(fileId=file.get('id'), mimeType=file.get('mimeType'))
        #         git.uploadFile(fileBytes=fileDict.get('fileBytes'), fileType=fileDict.get('type'),
        #                        name=name, team=team)
        #         fileId = file.get('id')
        #         document.fileId = fileId
        #         document.save()
        #
        #     Thread(target=uploadFile).start()

        return document

    def accept(self, bot):
        def thread():
            trello.addFile(fileName=self.name, link=drive.getFileLink(self.fileId), team=self.team)
            self.team.sendAll(message="Документ '" + self.name + "' был принят", bot=bot)

        Thread(target=thread).start()

        self.status = 1
        self.save()

    def reject(self, bot):
        def thread():
            self.team.sendAll(message="Документ '" + self.name + "' был отклонен", bot=bot)

        Thread(target=thread).start()

        self.status = -1
        self.save()


Document.create_table()
