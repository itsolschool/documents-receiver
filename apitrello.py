from trello import TrelloClient

import config

client = TrelloClient(
    api_key=config.trello_api,
    api_secret=config.trello_secret_api
)

def getBoard():
    for board in client.list_boards():
        if board.name == config.main_name:
            return board
    board = client.add_board(board_name=config.main_name, permission_level="private", default_lists=False)
    return board


def getList(board):
    for list in board.get_lists(list_filter="all"):
        if list.name == "Команды":
            return list
    list = board.add_list(name="Команды")
    return list


def createCard(team):
    board = getBoard()
    list = getList(board)
    card = list.add_card(name=team.name + ". " + team.school)
    team.trelloCard = card.id
    team.save()
    return card

def getCard(team):
    try:
        card = client.get_card(team.trelloCard)
        if card.closed:
            raise Exception
        return card
    except:
        return createCard(team)


def changeCardName(team, newName):
    card = getCard(team)
    card.set_name(newName + "." + team.school)


def addFile(fileName, link, team):
    card = getCard(team)
    card.set_description(fileName + "\n" + link + "\n" + card.description)
