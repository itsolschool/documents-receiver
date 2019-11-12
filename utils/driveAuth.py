from oauth2client import client
from oauth2client import tools
from oauth2client.file import Storage

SCOPES = 'https://www.googleapis.com/auth/drive'
CLIENT_SECRET_FILE = 'drive-python.json'
APPLICATION_NAME = 'ItSchoolBot'
credentials_file = 'drive-secret.json'


def get_gdrive_secret_token():
    try:
        import argparse
        flags = argparse.ArgumentParser(parents=[tools.argparser]).parse_args()
    except ImportError:
        flags = None
    store = Storage(credentials_file)
    credentials = store.get()
    if not credentials or credentials.invalid:
        flow = client.flow_from_clientsecrets(CLIENT_SECRET_FILE, SCOPES)
        flow.user_agent = APPLICATION_NAME
        credentials = tools.run_flow(flow, store, flags)
    return credentials


if __name__ == '__main__':
    get_gdrive_secret_token()
