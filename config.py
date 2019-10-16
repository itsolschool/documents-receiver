from os import environ

trello_api_key = environ.get('TRELLO_API_KEY')
trello_secret = environ.get('TRELLO_SECRET')

github_username = environ.get('GITHUB_USERNAME')
github_password = environ.get('GITHUB_PASSWORD')

telegram_token = ''  # Гугл расскажет как получить его у BotFather
tg_id = int(environ.get('TELEGRAM_ID'))  # Гугл покажет как получить телеграмм id
tg_username = environ.get('TELEGRAM_USERNAME')  # Без @ в начале
firstname = "ivan"
lastname = "ivanov"

proxy = ''  # Передавать строку формата http://username:password@ip:port, если прокси не нужен, оставьте просто ''

db_url = environ.get('DATABASE_URL')

main_name = "ItSchool2019"
docs = ['Заявка на участие',
        'Подготовка к мастерской',
        'Концепция',
        'Паспорт проекта',
        'Пользовательское тестирование',
        'Описание проекта к предзащите',
        'Финальная презентация']
