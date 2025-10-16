from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from chat_downloader import ChatDownloader
from contextlib import asynccontextmanager
from typing import Dict
import database
from models.schema import Stream, TwitchChatMessage, YouTubeChatMessage
from models.dicts import (
    PlatformType,
    message_groups_by_platform,
    DownloadStatus,
    MessageGroup,
)
from typing import List
from datetime import datetime
from pydantic import BaseModel
from models.tw_data_handler import TwitchDataHandler
from models.yt_data_handler import YouTubeDataHandler
from typing import Optional

import threading
import sys
import os
import json
import csv
import io


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("starting up...")
    database.init_db()
    db = database.SessionLocal()
    try:
        print("Database initialization completed successfully")
        cleanup_running_streams(db)
        yield
    finally:
        print("Shutting down...")
        db.close()


app = FastAPI(lifespan=lifespan)
log_path = os.environ.get("LOG_FILE_PATH")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["filename"],
)

running_chats: Dict[str, threading.Event] = {}


def cleanup_running_streams(db: Session):
    try:
        downloading_streams = (
            db.query(Stream)
            .filter(Stream.download_status == DownloadStatus.DOWNLOADING.value)
            .all()
        )

        for stream in downloading_streams:
            if stream.status == "live":
                stream.download_status = DownloadStatus.PAUSED.value
                stream.updated_at = datetime.now()
                print(f"Paused live stream on startup: {stream.url}")
            elif stream.status == "past":
                stream.download_status = DownloadStatus.COMPLETED.value
                stream.updated_at = datetime.now()
                stream.resume_timestamp = None
                print(f"Stopped past stream on startup: {stream.url}")

        db.commit()
        print(f"Cleaned up {len(downloading_streams)} streams on startup")
    except Exception as e:
        print(f"Error during startup cleanup: {e}", file=sys.stderr)
        db.rollback()
    finally:
        sys.stdout.flush()


@app.get("/health")
async def health_check(request: Request):
    return {"status": "ok", "log_file": log_path}


class StreamRequest(BaseModel):
    url: str


class StreamResponse(BaseModel):
    id: int
    url: str
    title: str | None = None
    stream_id: str | None = None
    platform: int
    status: str | None = None
    download_status: str
    duration: float | None = None
    updated_at: datetime
    resume_timestamp: datetime | None = None
    last_message_timestamp: datetime | None = None
    message_count: int = 0
    error: str | None = None


class PaginationInfo(BaseModel):
    total_count: int
    limit: int
    offset: int
    has_next: bool
    has_previous: bool


class MessagesResponse(BaseModel):
    stream_id: int
    platform: int
    messages: List[dict]
    pagination: PaginationInfo


def get_platform(url: str) -> PlatformType:
    url = url.lower()
    if "twitch.tv" in url:
        return PlatformType.TWITCH
    elif "youtube.com" in url:
        return PlatformType.YOUTUBE
    else:
        raise ValueError("Unsupported platform")


def start_download(stream_id: int, stop_event: threading.Event):
    db = database.SessionLocal()
    try:
        stream = db.query(Stream).filter(Stream.id == stream_id).first()
        if not stream:
            print(
                f"Stream with id {stream_id} not found for downloading.",
                file=sys.stderr,
            )
            return

        platform = PlatformType(stream.platform)
        chat_handler = (
            TwitchDataHandler(db)
            if platform == PlatformType.TWITCH
            else YouTubeDataHandler(db)
        )

        chat = ChatDownloader().get_chat(
            stream.url,
            message_groups=message_groups_by_platform[platform],
            interruptible_retry=False,
            retry_timeout=32,
            max_attempts=1000,
        )

        stream.title = chat.title
        stream.stream_id = chat.id
        stream.status = chat.status
        stream.duration = chat.duration
        stream.download_status = DownloadStatus.DOWNLOADING.value
        db.commit()

        for message in chat:
            if stop_event.is_set():
                break
            if "timestamp" in message:
                stream.last_message_timestamp = datetime.fromtimestamp(
                    message.get("timestamp") / 1_000_000
                )
            chat_handler.save_message(message, stream.id)

        if stop_event.is_set():
            stream.resume_timestamp = stream.last_message_timestamp
            print("Stream paused")
        else:
            running_chats.pop(stream.url, None)
            stream.download_status = DownloadStatus.COMPLETED.value
            print("Stream completed")

        stream.updated_at = datetime.now()
        db.commit()

    except Exception as e:
        error_msg = f"Error in chat downloader for stream {stream_id}: {e}"
        print(error_msg, file=sys.stderr)
        if stream:
            running_chats.pop(stream.url, None)
            stream.download_status = DownloadStatus.ERROR.value
            stream.error = str(e)
            stream.updated_at = datetime.now()
            db.commit()
    finally:
        print(f"Cleaning up resources for stream {stream_id}")
        sys.stdout.flush()
        if "chat_handler" in locals() and chat_handler:
            chat_handler.close()
        db.close()


@app.get("/streams/", response_model=List[StreamResponse])
async def get_streams(db: Session = Depends(database.get_db)):
    return database.db_retry_on_lock(
        lambda: db.query(Stream).order_by(Stream.created_at.desc()).all()
    )


class StreamUpdateRequest(BaseModel):
    stream_ids: List[int]


@app.post("/streams/status", response_model=List[StreamResponse])
async def update_streams(
    request: StreamUpdateRequest, db: Session = Depends(database.get_db)
):
    return database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.id.in_(request.stream_ids)).all()
    )


@app.post("/streams/", response_model=StreamResponse)
async def create_stream(request: StreamRequest, db: Session = Depends(database.get_db)):
    try:
        platform = get_platform(request.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    existing_stream = database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.url == request.url).first()
    )
    if existing_stream and (
        existing_stream.download_status
        in [DownloadStatus.DOWNLOADING.value, DownloadStatus.PAUSED.value]
    ):
        raise HTTPException(status_code=400, detail="Stream is already being processed")

    stream = Stream(
        url=request.url,
        platform=platform.value,
        download_status=DownloadStatus.DOWNLOADING.value,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)

    stop_event = threading.Event()
    running_chats[request.url] = stop_event
    thread = threading.Thread(
        target=start_download, args=(stream.id, stop_event), daemon=True
    )
    thread.start()

    return stream


@app.patch("/streams/{stream_id}/resume")
async def resume_stream(stream_id: int, db: Session = Depends(database.get_db)):
    stream = database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.id == stream_id).first()
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream.url in running_chats:
        raise HTTPException(status_code=400, detail="Stream is already running")

    stop_event = threading.Event()
    running_chats[stream.url] = stop_event
    thread = threading.Thread(
        target=start_download, args=(stream.id, stop_event), daemon=True
    )
    thread.start()
    stream.updated_at = datetime.now()
    db.commit()

    return {"status": "resumed"}


@app.patch("/streams/{stream_id}/pause")
async def pause_stream(stream_id: int, db: Session = Depends(database.get_db)):
    stream = database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.id == stream_id).first()
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream.url not in running_chats:
        raise HTTPException(status_code=400, detail="Stream is not running")

    running_chats[stream.url].set()
    running_chats.pop(stream.url)

    stream.download_status = DownloadStatus.PAUSED.value
    stream.updated_at = datetime.now()
    db.commit()

    return {"status": "paused"}


@app.patch("/streams/{stream_id}/stop")
async def stop_stream(stream_id: int, db: Session = Depends(database.get_db)):
    stream = database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.id == stream_id).first()
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.url in running_chats:
        running_chats[stream.url].set()
        running_chats.pop(stream.url)

    stream.download_status = DownloadStatus.COMPLETED.value
    stream.updated_at = datetime.now()
    stream.resume_timestamp = None
    db.commit()

    return {"status": "stopped", "stream_id": stream_id}


@app.get("/streams/{stream_id}/messages", response_model=MessagesResponse)
async def get_stream_messages(
    stream_id: int,
    limit: int = 500,
    offset: int = 0,
    dateTo: Optional[datetime] = None,
    dateFrom: Optional[datetime] = None,
    messageGroupIds: Optional[str] = None,
    includeBannedUsers: Optional[bool] = True,
    moderators: Optional[bool] = False,
    username: Optional[str] = None,
    message: Optional[str] = None,
    db: Session = Depends(database.get_db),
):
    parsed_message_group_ids = (
        [int(id.strip()) for id in messageGroupIds.split(",")]
        if messageGroupIds
        else []
    )

    stream = database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.id == stream_id).first()
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    model_class = (
        TwitchChatMessage
        if stream.platform == PlatformType.TWITCH.value
        else YouTubeChatMessage
    )

    def get_messages_and_count():
        query = db.query(model_class).filter(model_class.stream_id == stream_id)
        if parsed_message_group_ids:
            query = query.filter(
                model_class.message_group_id.in_(parsed_message_group_ids)
            )
        if dateTo:
            query = query.filter(model_class.timestamp < dateTo)
        if dateFrom:
            query = query.filter(model_class.timestamp > dateFrom)

        includeMessages = (
            MessageGroup.messages.value in parsed_message_group_ids
            if parsed_message_group_ids
            else True
        )

        banned_users_sub = (
            db.query(model_class.author_name)
            .filter(
                model_class.stream_id == stream_id,
                model_class.message_group_id == MessageGroup.bans.value,
            )
            .distinct()
        )

        if not includeBannedUsers and includeMessages:
            query = query.filter(~model_class.author_name.in_(banned_users_sub))
        elif includeBannedUsers and not includeMessages:
            sub = db.query(model_class).filter(
                model_class.message_group_id == MessageGroup.messages.value,
                model_class.author_name.in_(banned_users_sub),
            )
            query = query.union(sub)

        if moderators:
            query = query.filter(model_class.is_moderator)
        if username:
            filter_cond = model_class.author_name.ilike(f"%{username}%")
            if stream.platform == PlatformType.TWITCH.value:
                filter_cond |= model_class.author_display_name.ilike(f"%{username}%")
            query = query.filter(filter_cond)
        if message:
            query = query.filter(model_class.message.ilike(f"%{message}%"))

        total_count = query.count()
        messages = (
            query.order_by(model_class.timestamp.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return messages, total_count

    messages, total_count = database.db_retry_on_lock(get_messages_and_count)

    message_dicts = []
    for msg in messages:
        msg_dict = {
            "id": msg.id,
            "uuid": msg.message_id,
            "messageGroupId": msg.message_group_id,
            "timestamp": msg.timestamp,
            "author": {
                "id": msg.author_id,
                "isMod": msg.is_moderator,
            },
            "message": msg.message,
            "created_at": msg.created_at,
        }

        if stream.platform == PlatformType.TWITCH.value:
            msg_dict["author"].update(
                {
                    "name": msg.author_display_name or msg.author_name,
                    "isSub": msg.is_subscriber,
                    "color": msg.colour,
                }
            )
            msg_dict.update(
                {"systemMessage": msg.system_message, "banType": msg.ban_type}
            )
        elif stream.platform == PlatformType.YOUTUBE.value:
            msg_dict["author"].update(
                {
                    "name": msg.author_name,
                    "isSub": msg.is_member,
                }
            )
            msg_dict.update(
                {
                    "targetId": msg.target_message_id,
                    "deleted": msg.deleted,
                    "banType": ("removed" if msg.target_message_id else "retracted")
                    if msg.message_group_id == MessageGroup.bans.value
                    else None,
                }
            )

        message_dicts.append(msg_dict)

    pagination = PaginationInfo(
        total_count=total_count,
        limit=limit,
        offset=offset,
        has_next=offset + limit < total_count,
        has_previous=offset > 0,
    )

    return MessagesResponse(
        stream_id=stream_id,
        platform=stream.platform,
        messages=message_dicts,
        pagination=pagination,
    )


@app.delete("/streams/{stream_id}")
async def delete_stream(stream_id: int, db: Session = Depends(database.get_db)):
    stream = database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.id == stream_id).first()
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if stream.url in running_chats:
        running_chats[stream.url].set()
        running_chats.pop(stream.url)

    def delete_stream_data():
        model_class = (
            TwitchChatMessage
            if stream.platform == PlatformType.TWITCH.value
            else YouTubeChatMessage
        )
        db.query(model_class).filter(model_class.stream_id == stream_id).delete()
        db.delete(stream)
        db.commit()

    database.db_retry_on_lock(delete_stream_data)
    return {"status": "deleted", "stream_id": stream_id}


@app.get("/streams/{stream_id}/export")
async def export_stream_messages(
    stream_id: int,
    format: str = "json",
    messageGroupIds: Optional[str] = None,
    includeBannedUsers: Optional[bool] = True,
    moderators: Optional[bool] = False,
    username: Optional[str] = None,
    message: Optional[str] = None,
    db: Session = Depends(database.get_db),
):
    if format.lower() not in ["json", "csv"]:
        raise HTTPException(status_code=400, detail="Unsupported format")
    parsed_message_group_ids = (
        [int(id.strip()) for id in messageGroupIds.split(",")]
        if messageGroupIds
        else []
    )
    stream = database.db_retry_on_lock(
        lambda: db.query(Stream).filter(Stream.id == stream_id).first()
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    model_class = (
        TwitchChatMessage
        if stream.platform == PlatformType.TWITCH.value
        else YouTubeChatMessage
    )

    def get_messages():
        query = db.query(model_class).filter(model_class.stream_id == stream_id)
        if parsed_message_group_ids:
            query = query.filter(
                model_class.message_group_id.in_(parsed_message_group_ids)
            )

        includeMessages = (
            MessageGroup.messages.value in parsed_message_group_ids
            if parsed_message_group_ids
            else True
        )

        banned_users_sub = (
            db.query(model_class.author_name)
            .filter(
                model_class.stream_id == stream_id,
                model_class.message_group_id == MessageGroup.bans.value,
            )
            .distinct()
        )

        if not includeBannedUsers and includeMessages:
            query = query.filter(~model_class.author_name.in_(banned_users_sub))
        elif includeBannedUsers and not includeMessages:
            sub = db.query(model_class).filter(
                model_class.message_group_id == MessageGroup.messages.value,
                model_class.author_name.in_(banned_users_sub),
            )
            query = query.union(sub)

        if moderators:
            query = query.filter(model_class.is_moderator)
        if username:
            filter_cond = model_class.author_name.ilike(f"%{username}%")
            if stream.platform == PlatformType.TWITCH.value:
                filter_cond |= model_class.author_display_name.ilike(f"%{username}%")
            query = query.filter(filter_cond)
        if message:
            query = query.filter(model_class.message.ilike(f"%{message}%"))

        messages = query.order_by(model_class.timestamp.desc()).all()
        return messages

    messages= database.db_retry_on_lock(get_messages)

    message_dicts = []
    for msg in messages:
        msg_dict = {
            "message_type": MessageGroup(msg.message_group_id).name,
            "time": msg.timestamp.isoformat() if msg.timestamp else None,
            "message": msg.message,
        }

        if stream.platform == PlatformType.TWITCH.value:
            msg_dict.update(
                {
                    "author_name": msg.author_display_name or msg.author_name,
                    "system_message": msg.system_message,
                    "ban_type": msg.ban_type,
                    "is_subscriber": msg.is_subscriber,
                }
            )
        elif stream.platform == PlatformType.YOUTUBE.value:
            msg_dict.update(
                {
                    "author_name": msg.author_name,
                    "ban_type": ("removed" if msg.target_message_id else "retracted")
                    if msg.message_group_id == MessageGroup.bans.value
                    else None,
                    "is_subscriber": msg.is_member,
                }
            )
        msg_dict.update(
            {
                "is_moderator": msg.is_moderator,
            }
        )

        message_dicts.append(msg_dict)

    output = io.StringIO()
    if format.lower() == "json":
        json.dump(message_dicts, output, indent=2, ensure_ascii=False)
        media_type = "application/json"
    else:  # csv
        if not message_dicts:
            return StreamingResponse(
                io.BytesIO(b""),
                media_type="text/csv",
                headers={
                    "filename": f"{stream.stream_id or 'export'}_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"
                },
            )

        writer = csv.DictWriter(output, fieldnames=message_dicts[0].keys())
        writer.writeheader()
        writer.writerows(message_dicts)
        media_type = "text/csv"

    content = output.getvalue()
    output.close()

    filename = f"{stream.stream_id or 'export'}_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}"
    headers = {"Content-Type": media_type, "filename": filename}

    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")), media_type=media_type, headers=headers
    )


if __name__ == "__main__":
    import uvicorn

    port = os.environ.get("UVI_PORT")
    port = int(port) if port and port.isdigit() else 8000
    uvicorn.run(app, host="0.0.0.0", port=port)
