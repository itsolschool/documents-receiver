from telebot import types

main_admin = types.ReplyKeyboardMarkup()
main_admin.row('/add_team', '/editTeam')
main_admin.row('/checkDocs', '/sendAll')
main_admin.row('/exit')

main_user = types.ReplyKeyboardMarkup()
main_user.row('/sendDoc', '/getTeamInfo')

back = types.ReplyKeyboardMarkup()
back.row('назад')

team_edit = types.ReplyKeyboardMarkup()
team_edit.row('Добавить участника', 'Удалить участника')
team_edit.row('Изменить название', 'Удалить команду')
team_edit.row('Разослать сообщение всей команде')
team_edit.row('назад', 'главное меню')

verifyDocument = types.ReplyKeyboardMarkup()
verifyDocument.row('Отклонить', 'Подтвердить')
verifyDocument.row('Следующий документ')
verifyDocument.row('Назад', 'Главное меню')

addMessage = types.ReplyKeyboardMarkup()
addMessage.row('Да', 'Нет')

# if __name__ == '__main__':
    # def getReplyMarkup(number):
    #     markup = types.ReplyKeyboardMarkup()
    #
    #     markup.add("")
    #
    #     return markup
    #
    # print(getReplyMarkup(6).keyboard)