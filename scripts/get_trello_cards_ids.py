# create request getting json by url
# create request getting json by url
import requests
import json
import sys
import re

key = ""
token = ""


def get_json(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return json.loads(response.text)
        else:
            raise Exception("Error: response status code is not 200")
    except Exception as e:
        print("Error: " + str(e))
        sys.exit(1)


def get_data_from_json(json_data):
    try:
        data = []
        for item in json_data:
            data.append(item["id"])
        return data
    except Exception as e:
        print("Error: " + str(e))
        sys.exit(1)


def get_card_id_and_name_of_card_from_json_data(json_data):
    try:
        data = {}
        data["id"] = json_data["id"]
        data["name"] = json_data["name"]
        data["google"] = ""
        return data
    except Exception as e:
        print("Error: " + str(e))
        sys.exit(1)


def get_data_from_api(list_id):
    url = f"https://api.trello.com/1/lists/{list_id}/cards?key={key}&token={token}"
    json_data = get_json(url)
    data = get_data_from_json(json_data)
    return data


def get_data_about_card(card_id):
    url = f"https://api.trello.com/1/cards/{card_id}?key={key}&token={token}"
    json_data = get_json(url)
    data = get_card_id_and_name_of_card_from_json_data(json_data)
    return data


def save_data_to_file(data, file_name):
    with open(file_name, 'w') as outfile:
        json.dump(data, outfile, indent=4, ensure_ascii=False)


def read_data_from_file(file_name):
    with open(file_name) as json_file:
        data = json.load(json_file)
        return data


def main():
    data = []
    for list_id in ["ID_OF_LIST"]:
        data += get_data_from_api(list_id)
    save_data_to_file(data, "data.json")

    info = read_data_from_file("data.json")
    cardsdata = []
    for item in info:
        cardsdata.append(get_data_about_card(item))
    save_data_to_file(cardsdata, "cards.json")
    # data = read_data_from_file("cards.json")
    # save_data_to_file(data, "cards.json")


if __name__ == "__main__":
    main()
