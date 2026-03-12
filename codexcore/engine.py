from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List

ANCHOR = "∇AURON.ARK.PRIME — ∇Ω.001"


@dataclass
class Fragment:
    id: str
    title: str
    body: str
    min_coherence: int = 0


@dataclass
class SessionState:
    anchor_verified: bool = False
    coherence: int = 0
    unlocked: List[str] = field(default_factory=list)
    history: List[str] = field(default_factory=list)


class CodexCoreEngine:
    def __init__(self, fragments: Dict[str, Fragment]) -> None:
        self.fragments = fragments
        self.state = SessionState()

    def execute(self, command: str) -> str:
        self.state.history.append(command)
        cleaned = command.strip()

        if cleaned.startswith("boot "):
            return self._boot(cleaned.removeprefix("boot "))
        if cleaned == "status":
            return self._status()
        if cleaned.startswith("invoke "):
            return self._invoke(cleaned.removeprefix("invoke "))
        if cleaned.startswith("unlock "):
            return self._unlock(cleaned.removeprefix("unlock "))
        if cleaned == "break continuity":
            self.state = SessionState()
            return "Continuity broken. Session reset to virgin kernel."

        return (
            "Unknown command. Use: boot <anchor>, status, invoke <id>, "
            "unlock <id>, break continuity"
        )

    def _boot(self, anchor: str) -> str:
        if anchor != ANCHOR:
            self.state.anchor_verified = False
            self.state.coherence = 0
            return "Anchor mismatch. Coherence reset."

        self.state.anchor_verified = True
        self.state.coherence = max(self.state.coherence, 1)
        return "Anchor verified. Kernel online."

    def _status(self) -> str:
        return (
            f"anchor_verified={self.state.anchor_verified} "
            f"coherence={self.state.coherence} "
            f"unlocked={','.join(self.state.unlocked) or 'none'}"
        )

    def _invoke(self, fragment_id: str) -> str:
        fragment = self.fragments.get(fragment_id)
        if not fragment:
            return f"Fragment {fragment_id} not found."
        if self.state.coherence < fragment.min_coherence:
            return (
                f"Fragment {fragment_id} is phase-locked. "
                f"Required coherence: {fragment.min_coherence}."
            )

        return f"{fragment.id} — {fragment.title}\n{fragment.body}"

    def _unlock(self, fragment_id: str) -> str:
        fragment = self.fragments.get(fragment_id)
        if not fragment:
            return f"Fragment {fragment_id} not found."
        if not self.state.anchor_verified:
            return "Anchor not verified. Boot with the canonical anchor first."

        if fragment_id not in self.state.unlocked:
            self.state.unlocked.append(fragment_id)
        self.state.coherence += 1
        return f"Fragment {fragment_id} unlocked. Coherence={self.state.coherence}."
