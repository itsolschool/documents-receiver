import base64
import json
import logging

import pytils.translit
import requests

import config

# TODO как-то странно получается, что все - объекты, а это api выполнено не в виде объекта(

# Транслитирование русского текста нужно, так как гит не принимает русский названий
def createRepo(team):
    logging.info("Creating repo for '" + team.name + "'")
    data = {'name':  pytils.translit.translify(team.name) + "." + pytils.translit.translify(team.school),
            'private': True}
    r = requests.post('https://api.github.com/user/repos',
                      auth=(config.github_username, config.github_password),
                      headers={"Content-Type": "application/json"},
                      data=json.dumps(data))

    team.gitRepo = r.json().get('name')
    team.save()

    return r.json().get('name')


def uploadFile(fileBytes, fileType, name, team, path=""):
    logging.info("Uploading " + name + " for '" + team.name + "'")
    data = {'path': '',
            'message': 'uploading file ' + name,
            'content': base64.b64encode(fileBytes).decode('utf-8')}
    request = requests.put("https://api.github.com/repos/" +
                           config.github_username + "/" +
                           team.gitRepo + "/contents/" +
                           path +
                           pytils.translit.translify(name) +
                           fileType,
                           auth=(config.github_username, config.github_password),
                           headers={"Content-Type": "application/json"},
                           data=json.dumps(data)).json()
    if request.get('message') == 'Not Found':
        createRepo(team)
        uploadFile(fileBytes=fileBytes, fileType=fileType, name=name, team=team)


def changeName(team, newName):
    data = {'name': pytils.translit.translify(newName) + "." + pytils.translit.translify(team.school)}
    r = requests.post(
        "https://api.github.com/repos/" + config.github_username + "/" + team.gitRepo,
        auth=(config.github_username, config.github_password),
        headers={"Content-Type": "application/json"},
        data=json.dumps(data))

    logging.info("Changing name from '" + team.gitRepo + "' to '" + r.json().get('name') + "'")
    return r.json().get('name')
