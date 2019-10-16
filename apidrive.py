from __future__ import print_function

import io
import json

import httplib2
import requests
from apiclient import discovery
from apiclient.http import MediaIoBaseDownload
from oauth2client.file import Storage

import apigithub as git
import config

APPLICATION_NAME = 'ItSchoolBot'
credentials_file = 'drive-secret.json'

with open(credentials_file, 'w+') as f:
    f.write(config.gdrive_secret)

credentials = Storage(credentials_file).get()
http = credentials.authorize(httplib2.Http())
service = discovery.build('drive', 'v3', http=http)
service_v2 = discovery.build('drive', 'v2', http=http)

# Так как google drive api требует использования разных методов для скачивания обычных файлов и google файлов
# (например google document) пришлось разбить на два словаря для удобства
fileTypes = {'application/msword': ".doc",
             'application/pdf': ".pdf",
             'video/mp4': ".mp4",
             'audio/mpeg': ".mp3",
             'image/png': ".png",
             'image/jpeg': ".jpg",
             'application/vnd.openxmlformats-officedocument.presentationml.presentation': ".pptx",
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ".pdf"}

googleTypes = {'application/vnd.google-apps.document': ['application/pdf', ".pdf"],
               'application/vnd.google-apps.presentation': [
                   'application/vnd.openxmlformats-officedocument.presentationml.presentation', ".pptx"]}


def getMainFolder():
    folders = service.files().list(q='name = "' + config.main_name + '" and trashed = False',
                                   fields='files(id)').execute().get('files')
    if len(folders) > 0:
        return folders[0].get('id')
    else:
        return createMainFolder()


def createMainFolder():
    file_metadata = {
        'name': config.main_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    return service.files().create(body=file_metadata, fields='id').execute().get('id')


def getFolder(team):
    try:
        folder = service.files().get(fileId=team.driveFolder, fields='id, trashed').execute()
        if folder.get('trashed'):
            raise Exception
        return folder.get('id')
    except:
        folderId = createFolder(team=team)
        return folderId


def createFolder(team):
    mainFolder = getMainFolder()
    file_metadata = {
        'name': team.name + '.' + team.school,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    folder = service.files().create(body=file_metadata, fields='id, parents').execute()
    team.driveFolder = service.files().update(fileId=folder.get('id'),
                                              addParents=mainFolder,
                                              removeParents=folder.get('parents')[0],
                                              fields='id').execute().get('id')
    team.save()
    return team.driveFolder


def getFileId(link):
    # Я не нашел нормального способа получить fileId по ссылке доступа
    link = link[link.find("/d/") + 3:]
    if link.find("/") != -1:
        link = link[:link.find("/")]
    return link


# Скачать копию с чужого диска
def CopyToDrive(fileId, copy_name, parent):
    body = {'title': "copy_file",
            'name': copy_name}
    file = service.files().copy(
        fileId=fileId, body=body, fields='id, parents').execute()
    return service.files().update(fileId=file.get('id'),
                                  addParents=parent,
                                  removeParents=file.get('parents')[0],
                                  fields='id, mimeType').execute()


def changeFolderName(team, newName):
    file_metadata = {
        'name': newName + "." + team.school,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    service.files().update(fileId=team.driveFolder, body=file_metadata).execute()


def getFileLink(fileId):
    try:
        return service.files().get(fileId=fileId,
                                   fields='webViewLink').execute().get('webViewLink')
    except:
        return "Файл был удален или еще не загружен"


def getFile(fileId, mimeType):
    file = io.BytesIO()
    if mimeType in fileTypes.keys():
        request = service.files().get_media(fileId=fileId)
        fileType = fileTypes[mimeType]
    elif mimeType in googleTypes.keys():
        request = service.files().export_media(fileId=fileId, mimeType=googleTypes[mimeType][0])
        fileType = googleTypes[mimeType][1]
    else:
        return
    downloader = MediaIoBaseDownload(file, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
    return {"fileBytes": file.getvalue(), "type": fileType}


def isFolder(link):
    # Я не нашел нормальных способов получить тип файла по ссылке
    if link.find("/folders/") == -1:
        return False
    else:
        return True


def getFolderId(link):
    # Я не нашел нормальных способов получить folderId по ссылке
    folderId = link[link.find('folders/') + 8:]
    if folderId.find('?') != -1:
        folderId = folderId[:folderId.find('?')]
    return folderId


def copyFolderToDrive(folderId, copy_name, parent):
    file_metadata = {
        'name': copy_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    folder = service.files().create(body=file_metadata, fields='id, parents').execute()
    newFolder = service.files().update(fileId=folder.get('id'),
                                       addParents=parent,
                                       removeParents=folder.get('parents')[0],
                                       fields='id, name').execute()

    for item in service_v2.children().list(folderId=folderId).execute().get('items'):

        # Google drive api v2 дает недостаточно информации
        fileInfo = service.files().get(fileId=item.get('id'), fields='name, mimeType').execute()
        if fileInfo.get('mimeType') != 'application/vnd.google-apps.folder':
            file = getFile(fileId=item.get('id'), mimeType=fileInfo.get('mimeType'))
            uploadBytesToDrive(fileBytes=file.get('fileBytes'),
                               parent=newFolder.get('id'),
                               mimeType=fileInfo.get('mimeType'),
                               name=fileInfo.get('name'))
        else:
            copyFolderToDrive(folderId=item.get('id'), copy_name=fileInfo.get('name'), parent=newFolder.get('id'))
    return newFolder.get('id')


def uploadBytesToDrive(fileBytes, parent, mimeType, name):
    # google-drive-api-client не позволяет загружать напрямую байты и требует файл, поэтому лучше так
    auth_token = json.load(open(credentials_file)).get('access_token')
    headers = {"Authorization": "Bearer " + auth_token}
    para = {
        "title": name,
        "parents": [{"id": parent}],
        "mimeType": mimeType
    }
    files = {
        "data": ("metadata", json.dumps(para), "application/json; charset=UTF-8"),
        "file": fileBytes
    }
    requests.post("https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart", headers=headers,
                  files=files)


def uploadFolderToGithub(folderId, name, team, path=""):
    for item in service_v2.children().list(folderId=folderId).execute().get('items'):
        fileInfo = service.files().get(fileId=item.get('id'), fields='name, mimeType').execute()
        if fileInfo.get('mimeType') != 'application/vnd.google-apps.folder':
            file = getFile(fileId=item.get('id'), mimeType=fileInfo.get('mimeType'))
            if fileInfo.get('mimeType') in googleTypes.keys():
                fileType = googleTypes[fileInfo.get('mimeType')]
            elif fileInfo.get('mimeType') in fileTypes.keys():
                fileType = fileTypes[fileInfo.get('mimeType')]
            else:
                fileType = ""
            git.uploadFile(fileBytes=file.get('fileBytes'),
                           fileType=fileType,
                           name=fileInfo.get("name"),
                           team=team,
                           path=path + name + "/")
        else:
            uploadFolderToGithub(item.get('id'), name=fileInfo.get('name'), team=team, path=path + name + "/")


def isValidLink(link):
    try:
        # Так как нормальных способов определять верную ссылку я не нашел то вот:
        # Тут я просто объединил функции getFolderId и getFileId, то есть проверяю возможность получения Id
        requests.get(link)
        if isFolder(link):
            if link.find('folders/') == -1:
                raise Exception
        else:
            if link.find("/d/") == -1:
                raise Exception
        return True
    except:
        return False
