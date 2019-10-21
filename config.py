from os import environ

trello_api_key = environ.get('TRELLO_API_KEY')
trello_secret = environ.get('TRELLO_SECRET')

github_username = environ.get('GITHUB_USERNAME')
github_password = environ.get('GITHUB_PASSWORD')

telegram_token = environ.get('TELEGRAM_TOKEN')  # Гугл расскажет как получить его у BotFather
tg_id = int(environ.get('TELEGRAM_ADMIN_ID'))  # Гугл покажет как получить телеграмм id
tg_username = environ.get('TELEGRAM_ADMIN_USERNAME')  # Без @ в начале
firstname = environ.get('TELEGRAM_ADMIN_FIRST')
lastname = environ.get('TELEGRAM_ADMIN_LAST')

gdrive_secret = environ.get('GDRIVE_SECRET')

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

webhook_url = 'https://%s.herokuapp.com/hook' % environ.get('HEROKU_APP_NAME')
