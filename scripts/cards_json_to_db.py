import pandas as pd
import string
import random
from sqlalchemy import create_engine

pddata = pd.read_json("cards.json")


def id_generator():
    return ''.join(random.choice(string.ascii_uppercase + string.digits) for
                   _ in range(10))


# id_generator()
pddata["capacity"] = 5
pddata["gdrive_folder_id"] = pddata["google"]
pddata["trello_card_id"] = pddata["id"]
pddata["school_name"] = ""
pddata["invite_token"] = pd.Series(
    [id_generator() for x in range(len(pddata.index))])
pddata.drop(["id", "google"], axis=1, inplace=True)
# pdata to sql
engine = create_engine(
    "postgresql://PGUSER:PGPASSWORD@HOST:5432/DB_NAME")

pddata.to_sql("teams", con=engine, if_exists="append", index=False)
