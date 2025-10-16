from datetime import datetime
from models.schema import Stream, YouTubeChatMessage
from models.dicts import PlatformType, MessageGroup


def test_create_stream(client, db_session, monkeypatch):
    monkeypatch.setattr("main.start_download", lambda *args, **kwargs: None)

    test_url = "https://www.youtube.com/watch?v=asd"
    response = client.post("/streams/", json={"url": test_url})

    assert response.status_code == 200
    data = response.json()
    assert data["url"] == test_url
    assert data["platform"] == PlatformType.YOUTUBE.value
    assert data["download_status"] == "downloading"
    assert "id" in data
    stream_in_db = db_session.query(Stream).filter(Stream.id == data["id"]).first()
    assert stream_in_db.url == test_url


def test_create_stream_invalid_platform(client):
    response = client.post("/streams/", json={"url": "https://lalala.com"})
    assert response.status_code == 400
    assert response.json() == {"detail": "Unsupported platform"}


def test_get_stream_messages(client, db_session):
    test_stream = Stream(
        url="https://www.youtube.com/watch?v=test",
        platform=PlatformType.YOUTUBE.value,
        download_status="completed",
    )
    db_session.add(test_stream)
    db_session.commit()

    messages_data = [
        {
            "message": "message 1",
            "author_name": "user2",
            "message_group_id": MessageGroup.messages.value,
            "timestamp": datetime(2025, 1, 1, 12, 0, 0),
        },
        {
            "message": "sub message",
            "author_name": "user2",
            "message_group_id": MessageGroup.subs.value,
            "timestamp": datetime(2025, 1, 1, 12, 1, 0),
        },
        {
            "message": "message 2 asd",
            "author_name": "user1",
            "message_group_id": MessageGroup.messages.value,
            "timestamp": datetime(2025, 1, 1, 12, 2, 0),
        },
        {
            "message": "user1 banned",
            "author_name": "user1",
            "message_group_id": MessageGroup.bans.value,
            "timestamp": datetime(2025, 1, 1, 12, 3, 0),
        },
    ]

    for msg_data in messages_data:
        msg = YouTubeChatMessage(stream_id=test_stream.id, **msg_data)
        db_session.add(msg)
    db_session.commit()

    # all messages
    response = client.get(f"/streams/{test_stream.id}/messages")
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 4
    assert data["pagination"]["total_count"] == 4

    # filter message
    response = client.get(f"/streams/{test_stream.id}/messages?message=asd")
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 1

    # user search
    response = client.get(f"/streams/{test_stream.id}/messages?username=user1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2
    assert data["messages"][0]["author"]["name"] == "user1"

    # bans and subs only
    response = client.get(
        f"/streams/{test_stream.id}/messages?messageGroupIds=2,3&includeBannedUsers=false"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2

    # show bans with messages by banned users
    response = client.get(
        f"/streams/{test_stream.id}/messages?messageGroupIds=2&includeBannedUsers=true"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2
