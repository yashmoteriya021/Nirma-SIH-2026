"""
In-memory slot-filling session store.

Good enough for a demo / single-process deployment. Swap for Redis if the
service is ever scaled horizontally.
"""

import threading
import time
import uuid

from module2_intent.slot_machine import SlotFillingSession

SESSION_TTL_SECONDS = 30 * 60


class SessionStore:
    def __init__(self, ttl: int = SESSION_TTL_SECONDS):
        self._ttl = ttl
        self._lock = threading.Lock()
        self._sessions: dict[str, tuple[SlotFillingSession, float]] = {}

    def _evict_expired(self, now: float) -> None:
        expired = [k for k, (_, ts) in self._sessions.items() if now - ts > self._ttl]
        for k in expired:
            del self._sessions[k]

    def get_or_create(
        self, session_id: str | None, profile: dict, language: str
    ) -> tuple[str, SlotFillingSession]:
        now = time.time()
        with self._lock:
            self._evict_expired(now)
            if session_id and session_id in self._sessions:
                session, _ = self._sessions[session_id]
                session.profile = profile or session.profile
                session.language = language
                self._sessions[session_id] = (session, now)
                return session_id, session

            new_id = str(uuid.uuid4())
            session = SlotFillingSession(profile=profile, language=language)
            self._sessions[new_id] = (session, now)
            return new_id, session

    def drop(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def __len__(self) -> int:
        return len(self._sessions)
