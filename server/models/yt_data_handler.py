from models.schema import YouTubeChatMessage
from models.dicts import message_types
from typing import Dict, Any, Optional
from datetime import datetime
from models.base_data_handler import BaseDataHandler
import sys

from sqlalchemy.orm import Session

class YouTubeDataHandler(BaseDataHandler):
    def __init__(self, db: Optional[Session] = None):
        super().__init__(db)

    def save_message(
        self, data: Dict[str, Any], stream_id: Optional[int] = None
    ) -> bool:
        try:
            message_type = data.get("message_type", "")
            action_type = data.get("action_type")
            message_group = message_types.get(message_type)

            if action_type == "remove_chat_item":
                return self._handle_message_removal(data, message_group, stream_id)

            if action_type == "remove_chat_item_by_author":
                return True

            if not message_group:
                print(f"Unknown YouTube message type: {message_type}")
                sys.stdout.flush()
                return False

            author = data.get("author", {})
            badges = author.get("badges", [])
            is_moderator = any(
                badge.get("icon_name") == "moderator" for badge in badges
            )
            is_member = any("Member" in badge.get("title") for badge in badges)

            chat_message = YouTubeChatMessage(
                message_id=data.get("message_id"),
                message_group_id=message_group.value,
                timestamp=datetime.fromtimestamp(data.get("timestamp", 0) / 1_000_000),
                stream_id=stream_id,
                author_name=author.get("name"),
                author_id=author.get("id"),
                is_moderator=is_moderator,
                is_member=is_member,
                message=data.get("message"),
                header_primary_text=data.get("header_primary_text"),
                header_secondary_text=data.get("header_secondary_text"),
                money=data.get("money"),
            )

            self.message_batch.append(chat_message)
            self._increment_message_count(stream_id)

            self._check_flush_conditions()

            return True

        except Exception as e:
            print(f"Error saving YouTube message: {e}")
            sys.stdout.flush()
            self.db.rollback()
            return False

    def _handle_message_removal(self, data: Dict[str, Any], message_group, stream_id: Optional[int]) -> bool:
        target_message_id = data.get("target_message_id")
        if not target_message_id:
            return False

        self.flush_batch()

        result = (
            self.db.query(YouTubeChatMessage)
            .filter(YouTubeChatMessage.message_id == target_message_id)
            .first()
        )

        if not result:
            return False

        result.deleted = True
        chat_message = YouTubeChatMessage(
            message_group_id=message_group.value,
            stream_id=stream_id,
            author_name=result.author_name,
            author_id=result.author_id,
            is_moderator=result.is_moderator,
            is_member=result.is_member,
            message=result.message,
            target_message_id=result.id,
        )
        self.message_batch.append(chat_message)
        self._increment_message_count(stream_id)

        if len(self.message_batch) >= self.batch_size:
            self.flush_batch()

        return True
