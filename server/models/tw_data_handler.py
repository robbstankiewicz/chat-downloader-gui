from models.schema import TwitchChatMessage
from models.dicts import message_types
from typing import Dict, Any, Optional
from datetime import datetime
from models.base_data_handler import BaseDataHandler
import sys

from sqlalchemy.orm import Session

class TwitchDataHandler(BaseDataHandler):
    def __init__(self, db: Optional[Session] = None):
        super().__init__(db)

    def save_message(
        self, data: Dict[str, Any], stream_id: Optional[int] = None
    ) -> bool:
        try:
            author = data.get("author", {})
            message_type = data.get("message_type", "")
            message_group = message_types.get(message_type)

            if not message_group:
                print(f"Unknown message type: {message_type}")
                sys.stdout.flush()
                return False

            if message_type == "ban_user":
                chat_message = self._create_ban_message(
                    data, message_group, stream_id
                )
            else:
                chat_message = self._create_regular_message(
                    data, message_group, stream_id, author
                )

            self.message_batch.append(chat_message)
            self._increment_message_count(stream_id)

            self._check_flush_conditions()

            return True

        except Exception as e:
            print(f"Error saving message: {e}")
            sys.stdout.flush()
            self.db.rollback()
            return False

    def _create_ban_message(self, data: Dict[str, Any], message_group, stream_id: Optional[int]) -> TwitchChatMessage:
        author = data.get("author", {})
        author_name = data.get("banned_user")
        author_id = author.get("target_id")
        ban_type = "timeout" if data.get("ban_type") == "timeout" else "permaban"
        message = f"User {author_name} got {ban_type}"

        return TwitchChatMessage(
            message_group_id=message_group.value,
            stream_id=stream_id,
            author_name=author_name,
            timestamp=datetime.fromtimestamp(data.get("timestamp", 0) / 1_000_000),
            author_id=author_id,
            author_display_name=author_name,
            system_message=message,
            ban_duration=data.get("ban_duration"),
            ban_type=ban_type,
        )

    def _create_regular_message(self, data: Dict[str, Any], message_group, stream_id: Optional[int], author: Dict[str, Any]) -> TwitchChatMessage:
        message_type = data.get("message_type", "")

        return TwitchChatMessage(
            message_id=data.get("message_id"),
            message_group_id=message_group.value,
            timestamp=datetime.fromtimestamp(data.get("timestamp", 0) / 1_000_000),
            stream_id=stream_id,
            author_name=author.get("name"),
            author_id=author.get("id"),
            author_display_name=author.get("display_name"),
            is_moderator=author.get("is_moderator"),
            is_subscriber=author.get("is_subscriber"),
            colour=data.get("colour"),
            message=data.get("message"),
            cumulative_months=data.get("cumulative_months") if "subscription" in message_type else None,
            system_message=data.get("system_message") if "subscription" in message_type else None,
        )
