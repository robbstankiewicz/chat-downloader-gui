from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import time
import sys

from models.schema import Stream
from database import SessionLocal, db_retry_on_lock

class BaseDataHandler(ABC):
    def __init__(self, db: Optional[Session] = None, flush_interval: int = 10, batch_size: int = 100):
        self.db = db if db else SessionLocal()
        self.owns_db = db is None
        self.message_batch = []
        self.batch_size = batch_size
        self.stream_message_counts = {}
        self.last_flush_time = time.time()
        self.flush_interval = flush_interval

    def flush_batch(self):
        if not self.message_batch:
            return

        def _flush_operation():
            self.db.add_all(self.message_batch)

            for stream_id, count in self.stream_message_counts.items():
                stream = self.db.query(Stream).filter(Stream.id == stream_id).first()
                if stream:
                    stream.message_count += count

            self.db.commit()

            self.message_batch.clear()
            self.stream_message_counts.clear()

        try:
            db_retry_on_lock(_flush_operation)
            self.last_flush_time = time.time()
        except Exception as e:
            print(f"Error flushing batch: {e}", file=sys.stderr)
            sys.stdout.flush()
            self.db.rollback()

    def close(self):
        self.flush_batch()
        if self.owns_db:
            self.db.close()

    def _increment_message_count(self, stream_id: Optional[int]) -> None:
        if stream_id:
            self.stream_message_counts[stream_id] = self.stream_message_counts.get(stream_id, 0) + 1

    def _check_flush_conditions(self):
        current_time = time.time()
        if (len(self.message_batch) >= self.batch_size or
            current_time - self.last_flush_time >= self.flush_interval):
            self.flush_batch()

    @abstractmethod
    def save_message(
        self, data: Dict[str, Any], stream_id: Optional[int] = None
    ) -> bool:
        pass
