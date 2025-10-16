import pytest
import json
import os

from models.yt_data_handler import YouTubeDataHandler
from models.schema import YouTubeChatMessage

YT_MESSAGES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "yt_messages.json"
)
YT_BANS_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "yt_bans.json")
YT_SUPERCHATS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "yt_superchats.json"
)

with open(YT_MESSAGES_PATH) as f:
    YT_MESSAGES_DATA = json.load(f)

with open(YT_BANS_PATH) as f:
    YT_BANS_DATA = json.load(f)

with open(YT_SUPERCHATS_PATH) as f:
    YT_SUPERCHATS_DATA = json.load(f)


@pytest.mark.parametrize("message_data", YT_MESSAGES_DATA)
def test_save_youtube_message(db_session, message_data):
    handler = YouTubeDataHandler(db_session)

    success = handler.save_message(message_data, stream_id=1)
    handler.flush_batch()

    assert success

    message_in_db = (
        db_session.query(YouTubeChatMessage)
        .filter_by(message_id=message_data["message_id"])
        .first()
    )
    assert message_in_db is not None
    assert message_in_db.author_name == message_data["author"]["name"]
    assert message_in_db.message == message_data["message"]


@pytest.mark.parametrize("ban_data", YT_BANS_DATA)
def test_save_youtube_bans(db_session, ban_data):
    handler = YouTubeDataHandler(db_session)

    if ban_data.get("target_message_id"):
        banned_message = YouTubeChatMessage(
            message_id=ban_data["target_message_id"],
            stream_id=1,
            author_name="test_user",
            message_group_id=1,
            message="mssage to ban",
        )
        db_session.add(banned_message)
        db_session.commit()

    success = handler.save_message(ban_data, stream_id=1)
    handler.flush_batch()

    assert success

    if ban_data.get("target_message_id"):
        banned_message_in_db = (
            db_session.query(YouTubeChatMessage)
            .filter_by(message_id=ban_data["target_message_id"])
            .first()
        )
        assert banned_message_in_db.deleted


@pytest.mark.parametrize("superchat_data", YT_SUPERCHATS_DATA)
def test_save_youtube_superchat(db_session, superchat_data):
    handler = YouTubeDataHandler(db_session)

    success = handler.save_message(superchat_data, stream_id=1)
    handler.flush_batch()

    assert success

    message_in_db = (
        db_session.query(YouTubeChatMessage)
        .filter_by(message_id=superchat_data["message_id"])
        .first()
    )
    assert message_in_db is not None
