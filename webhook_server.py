import logging

import telebot
from flask import Flask, request

from main_bot import bot

bot.set_webhook('https://itsolschool-bot-1.herokuapp.com/hook')

flask_app = Flask(__name__)

# Логируем все что у нас есть в gunicorn, чтобы было видно в консоли
if __name__ != '__main__':
    gunicorn_logger = logging.getLogger('gunicorn.error')
    flask_app.logger.handlers = gunicorn_logger.handlers
    # Учитываем уровень логов самого gunicorn
    flask_app.logger.setLevel(gunicorn_logger.level)

    root_logger = logging.getLogger()
    root_logger.handlers = gunicorn_logger.handlers
    root_logger.setLevel(gunicorn_logger.level)


@flask_app.route('/hook', methods=['POST'])
def telegram():
    bot.process_new_updates([telebot.types.Update.de_json(request.stream.read().decode("utf-8"))])
    return "!", 200


@flask_app.route('/')
def main():
    return 'Hello world!'


if __name__ == '__main__':
    flask_app.run()
