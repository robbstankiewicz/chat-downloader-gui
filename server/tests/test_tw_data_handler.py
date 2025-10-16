import pytest
import json
import os
from models.tw_data_handler import TwitchDataHandler
from models.schema import TwitchChatMessage

TW_MESSAGES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "tw_messages.json"
)
TW_BANS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "tw_bans.json")
TW_SUBS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "tw_subscriptions.json"
)

with open(TW_MESSAGES_PATH) as f:
    TW_MESSAGES_DATA = json.load(f)

with open(TW_BANS_PATH) as f:
    TW_BANS_DATA = json.load(f)

with open(TW_SUBS_PATH) as f:
    TW_SUBS_DATA = json.load(f)


@pytest.mark.parametrize("message_data", TW_MESSAGES_DATA)
def test_save_twitch_message(db_session, message_data):
    handler = TwitchDataHandler(db_session)

    success = handler.save_message(message_data, stream_id=1)
    handler.flush_batch()

    assert success

    message_in_db = (
        db_session.query(TwitchChatMessage)
        .filter_by(message_id=message_data["message_id"])
        .first()
    )
    assert message_in_db is not None
    assert message_in_db.author_name == message_data["author"]["name"]
    assert message_in_db.message == message_data["message"]


@pytest.mark.parametrize("ban_data", TW_BANS_DATA)
def test_save_twitch_bans(db_session, ban_data):
    handler = TwitchDataHandler(db_session)

    success = handler.save_message(ban_data, stream_id=1)
    handler.flush_batch()

    assert success

    message_in_db = (
        db_session.query(TwitchChatMessage)
        .filter_by(author_name=ban_data["banned_user"])
        .first()
    )
    assert message_in_db is not None
    assert message_in_db.ban_type == 'timeout' or 'permabans'


@pytest.mark.parametrize("sub_data", TW_SUBS_DATA)
def test_save_twitch_subscription(db_session, sub_data):
    handler = TwitchDataHandler(db_session)

    success = handler.save_message(sub_data, stream_id=1)
    handler.flush_batch()

    assert success

    message_in_db = (
        db_session.query(TwitchChatMessage)
        .filter_by(message_id=sub_data["message_id"])
        .first()
    )
    assert message_in_db is not None
    assert message_in_db.system_message is not None
