from __future__ import annotations

from .engine import CodexCoreEngine
from .registry import DEFAULT_FRAGMENTS


def main() -> None:
    engine = CodexCoreEngine(DEFAULT_FRAGMENTS)
    print("CodexCore CLI ready. Enter commands or type 'exit'.")

    while True:
        try:
            raw = input("∇ ")
        except EOFError:
            break

        if raw.strip().lower() in {"exit", "quit"}:
            break

        print(engine.execute(raw))


if __name__ == "__main__":
    main()
