from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Float,
    Boolean,
    JSON,
    Index,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Stream(Base):
    __tablename__ = "streams"

    id = Column(Integer, primary_key=True)
    url = Column(String, nullable=False)
    title = Column(Text, nullable=True)
    stream_id = Column(String, nullable=True)
    platform = Column(Integer, nullable=False)
    status = Column(String, nullable=True)
    download_status = Column(String)
    error = Column(Text, nullable=True)
    duration = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now())
    updated_at = Column(DateTime, default=lambda: datetime.now(), onupdate=lambda: datetime.now())


    resume_timestamp = Column(DateTime, nullable=True)
    last_message_timestamp = Column(DateTime, nullable=True)


    message_count = Column(Integer, default=0, nullable=False)


class TwitchChatMessage(Base):
    __tablename__ = "twitch_chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String, nullable=True)
    message_group_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    stream_id = Column(Integer, ForeignKey('streams.id'), nullable=True)


    author_name = Column(String, nullable=True)
    author_id = Column(String, nullable=True)
    author_display_name = Column(String, nullable=True)
    is_moderator = Column(Boolean, nullable=True)
    is_subscriber = Column(Boolean, nullable=True)
    colour = Column(String, nullable=True)


    message = Column(Text, nullable=True)


    ban_duration = Column(Integer, nullable=True)
    ban_type = Column(String, nullable=True)


    cumulative_months = Column(Integer, nullable=True)
    system_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now())


    __table_args__ = (
        Index('ix_twitch_chat_timestamp', 'timestamp'),
        Index('ix_twitch_chat_message_group_id', 'message_group_id'),
        Index('ix_twitch_chat_stream_id', 'stream_id'),
        Index('ix_twitch_chat_author_name', 'author_name'),
        Index('ix_twitch_chat_author_display_name', 'author_display_name'),
        Index('ix_twitch_chat_message', 'message'),
        Index('ix_twitch_chat_is_moderator', 'is_moderator'),
    )


class YouTubeChatMessage(Base):
    __tablename__ = "youtube_chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(String, nullable=True)
    message_group_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now())
    stream_id = Column(Integer, ForeignKey('streams.id'), nullable=True)

    author_name = Column(String, nullable=True)
    author_id = Column(String, nullable=True)
    is_moderator = Column(Boolean, default=False, nullable=False)
    is_member = Column(Boolean, default=False, nullable=False)

    message = Column(Text, nullable=True)

    target_message_id = Column(String, nullable=True)

    header_primary_text = Column(Text, nullable=True)
    header_secondary_text = Column(Text, nullable=True)
    money = Column(JSON, nullable=True)

    deleted = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now())


    __table_args__ = (
        Index('ix_youtube_chat_timestamp', 'timestamp'),
        Index('ix_youtube_chat_message_group_id', 'message_group_id'),
        Index('ix_youtube_chat_stream_id', 'stream_id'),
        Index('ix_youtube_chat_author_name', 'author_name'),
        Index('ix_youtube_chat_author_id', 'author_id'),
        Index('ix_youtube_chat_target_message_id', 'target_message_id'),
        Index('ix_youtube_chat_message', 'message'),
        Index('ix_youtube_chat_deleted', 'deleted'),
        Index('ix_youtube_chat_is_moderator', 'is_moderator'),
        Index('ix_youtube_chat_is_member', 'is_member'),
    )
