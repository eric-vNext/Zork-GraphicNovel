#!/usr/bin/env python3
"""Extract room/object world data from the vendored ZIL sources into JSON.

Reads the `<ROOM ...>` and `<OBJECT ...>` forms out of a game's dungeon and
actions files and writes `game/src/data/zorkN/world.gen.json`, matching the
`WorldData` shape in `game/src/engine/types.ts`.

This is a real ZIL reader (tokenizer + datum parser), not a regex sweep: Zork
III defines 54 of its 89 rooms inside `3actions.zil`, interleaved with routine
code, and several property values contain nested forms. Regexes cannot see
where a definition ends.

Usage:
    python3 utils/extract-world.py            # all three games
    python3 utils/extract-world.py 2          # just Zork II
    python3 utils/extract-world.py --check 1  # diff against the committed JSON

Run from the repository root.
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GAMES = {
    1: {
        "source": "reference/zork1-source",
        "files": ["1dungeon.zil", "1actions.zil", "gglobals.zil"],
        "out": "game/src/data/zork1/world.gen.json",
    },
    2: {
        "source": "reference/zork2-source",
        "files": ["2dungeon.zil", "2actions.zil", "gglobals.zil"],
        "out": "game/src/data/zork2/world.gen.json",
    },
    3: {
        "source": "reference/zork3-source",
        "files": ["3dungeon.zil", "3actions.zil", "gglobals.zil"],
        "out": "game/src/data/zork3/world.gen.json",
    },
}

# `<DIRECTIONS ...>` from each game's dungeon file. ENTER is not in Zork III's
# DIRECTIONS declaration (it compiles to property 7, below the direction range)
# but is used as a walk direction on the mirror-box rooms and read as one by
# DUNGEON-MASTER-F, so we extract it as an exit and let the engine alias it to
# IN. See docs/trilogy-research.md.
DIRECTIONS = {
    "NORTH", "EAST", "WEST", "SOUTH", "NE", "NW", "SE", "SW",
    "UP", "DOWN", "IN", "OUT", "LAND", "CROSS", "ENTER",
}

# Properties consumed verbatim as strings.
STRING_PROPS = {"DESC": "desc", "LDESC": "ldesc", "FDESC": "fdesc", "TEXT": "text"}
# Properties consumed as integers.
INT_PROPS = {
    "SIZE": "size", "CAPACITY": "capacity", "VALUE": "value",
    "TVALUE": "tvalue", "STRENGTH": "strength",
}


# --------------------------------------------------------------------------
# ZIL reader
# --------------------------------------------------------------------------

class Sym(str):
    """A ZIL atom. Subclasses str so comparisons read naturally, but stays
    distinguishable from a string literal."""
    __slots__ = ()


class Form(list):
    """A `<...>` form."""
    __slots__ = ()


class Lst(list):
    """A `(...)` list."""
    __slots__ = ()


ATOM_BREAK = set(' \t\r\n()<>[]{}",;\'%')


def read_datums(text: str) -> list[Any]:
    """Parse a ZIL source file into a list of top-level datums.

    Handles: `<>` forms, `()` lists, `[]` vectors, string literals with `\\`
    escapes, `;` commented-out datums, `%` compile-time splices, `'` quotes,
    `!\\c` character constants, and the bare `\\` page separators that appear
    between sections of the Infocom sources.
    """
    pos = 0
    n = len(text)

    def skip_ws() -> None:
        nonlocal pos
        while pos < n and text[pos] in " \t\r\n\f":
            pos += 1

    def read_string() -> str:
        nonlocal pos
        assert text[pos] == '"'
        pos += 1
        buf = []
        while pos < n:
            c = text[pos]
            if c == "\\":
                # ZIL escapes the next character literally (\" and \\).
                pos += 1
                if pos < n:
                    buf.append(text[pos])
                    pos += 1
                continue
            if c == '"':
                pos += 1
                return "".join(buf)
            buf.append(c)
            pos += 1
        raise SyntaxError("unterminated string")

    def read_atom() -> Any:
        nonlocal pos
        start = pos
        while pos < n and text[pos] not in ATOM_BREAK:
            if text[pos] == "\\":  # escaped char inside an atom
                pos += 2
                continue
            pos += 1
        raw = text[start:pos]
        if not raw:
            raise SyntaxError(f"empty atom at {start}: {text[start:start+20]!r}")
        # A leading , or . marks a global/local reference; keep the bare name.
        body = raw.lstrip(",.")
        try:
            return int(raw)
        except ValueError:
            pass
        return Sym(body if body else raw)

    def read() -> Any:
        """Read one datum. Returns the sentinel SKIP for things we discard."""
        nonlocal pos
        skip_ws()
        if pos >= n:
            return EOF
        c = text[pos]

        if c == ";":  # commented-out datum: read and discard it
            pos += 1
            read()
            return SKIP
        if c == "\\":  # page separator, or an escaped atom
            if pos + 1 >= n or text[pos + 1] in " \t\r\n":
                pos += 1
                return SKIP
            return read_atom()
        if c == "%":  # compile-time splice: keep the inner datum
            pos += 1
            return read()
        if c == "'":  # quote
            pos += 1
            return read()
        if c == "!":
            # !\c character constant, or !, / !. splices
            pos += 1
            if pos < n and text[pos] == "\\":
                pos += 2
                return SKIP
            return read()
        if c in ",.":  # ,GLOBAL / .LOCAL reference — the prefix is not part of the name
            pos += 1
            return read_atom()
        if c == '"':
            return read_string()
        if c in "<([{":
            close = {"<": ">", "(": ")", "[": "]", "{": "}"}[c]
            pos += 1
            items: list[Any] = []
            while True:
                skip_ws()
                if pos >= n:
                    raise SyntaxError(f"unterminated {c!r} form")
                if text[pos] == close:
                    pos += 1
                    break
                if text[pos] in ">)]}":
                    # Mismatched closer; the sources are well-formed, so treat
                    # it as the end of this group rather than desynchronizing.
                    pos += 1
                    break
                item = read()
                if item is EOF:
                    raise SyntaxError(f"unterminated {c!r} form")
                if item is not SKIP:
                    items.append(item)
            return Form(items) if c == "<" else Lst(items)
        if c in ">)]}":
            # Stray closer at top level.
            pos += 1
            return SKIP
        return read_atom()

    datums: list[Any] = []
    while True:
        d = read()
        if d is EOF:
            break
        if d is not SKIP:
            datums.append(d)
    return datums


class _Sentinel:
    def __init__(self, name: str) -> None:
        self.name = name

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return self.name


SKIP = _Sentinel("SKIP")
EOF = _Sentinel("EOF")


# --------------------------------------------------------------------------
# ROOM / OBJECT translation
# --------------------------------------------------------------------------

# In Infocom's ZIL a `|` inside a string is an explicit line break used to
# force paragraph gaps; a run of them (with the physical newlines and any
# indentation that follows) is one blank line in the rendered output. Collapse
# each run to a single blank line, which is how the shipped Zork I data reads
# and how the presentation layer paragraphs these strings.
PIPE_RUN = re.compile(r"[ \t]*(?:\|[ \t]*\n[ \t]*)+")


def normalize_text(value: str) -> str:
    return PIPE_RUN.sub("\n\n", value)


def parse_exit(rest: list[Any]) -> dict[str, Any] | None:
    """Translate the tail of a direction property into an ExitDef.

    The five ZIL exit forms:
        (DIR TO room)
        (DIR TO room IF flag [ELSE "msg"])
        (DIR TO room IF obj IS OPEN [ELSE "msg"])
        (DIR PER routine)
        (DIR "msg")
    """
    if not rest:
        return {}
    head = rest[0]

    if isinstance(head, str) and not isinstance(head, Sym):
        return {"msg": normalize_text(head)}

    if head == "PER":
        return {"per": str(rest[1])}

    if head == "TO":
        exit_: dict[str, Any] = {"to": str(rest[1])}
        i = 2
        while i < len(rest):
            tok = rest[i]
            if tok == "IF":
                cond = str(rest[i + 1])
                # `IF obj IS OPEN` is a door check; `IF flag` is a global flag.
                if i + 3 < len(rest) and rest[i + 2] == "IS" and rest[i + 3] == "OPEN":
                    exit_["ifDoor"] = cond
                    i += 4
                else:
                    exit_["ifFlag"] = cond
                    i += 2
            elif tok == "ELSE":
                exit_["elseMsg"] = normalize_text(rest[i + 1])
                i += 2
            else:
                i += 1
        return exit_

    # Anything else (a bare symbol destination) is not a form the sources use.
    return None


def translate(defn: Form) -> tuple[str, str, dict[str, Any]]:
    """Turn a `<ROOM ...>` / `<OBJECT ...>` form into (kind, name, record)."""
    kind = str(defn[0])
    name = str(defn[1])
    is_room = kind == "ROOM"

    rec: dict[str, Any] = {}
    exits: dict[str, Any] = {}
    flags: list[str] = []
    globals_: list[str] = []
    pseudo: list[str] = []
    synonyms: list[str] = []
    adjectives: list[str] = []

    for prop in defn[2:]:
        if not isinstance(prop, Lst) or not prop:
            continue
        key = str(prop[0])
        rest = list(prop[1:])

        # A room's `(IN ROOMS)` is containment, not an IN exit; a room's
        # `(IN TO ...)` / `(IN PER ...)` / `(IN "msg")` is the exit. Objects
        # never have exits, so their `(IN x)` is always containment.
        #
        # Getting this wrong is what broke the previous extractor: it read
        # every room's `(IN ROOMS)` as an empty IN exit, which made `IN`
        # crash the engine in 105 of 110 Zork I rooms.
        if key == "IN":
            containment = not is_room or (
                len(rest) == 1 and isinstance(rest[0], Sym)
            )
            if containment:
                rec["in"] = str(rest[0])
                continue

        if is_room and key in DIRECTIONS:
            ex = parse_exit(rest)
            if ex is not None:
                exits[key] = ex
            continue

        if key == "FLAGS":
            flags = [str(f) for f in rest]
        elif key == "GLOBAL":
            globals_ = [str(g) for g in rest]
        elif key == "SYNONYM":
            synonyms = [str(s) for s in rest]
        elif key == "ADJECTIVE":
            adjectives = [str(a) for a in rest]
        elif key == "PSEUDO":
            # (PSEUDO "NAILS" NAILS-PSEUDO "NAIL" NAILS-PSEUDO) -> the strings
            pseudo = [p for p in rest if isinstance(p, str) and not isinstance(p, Sym)]
        elif key == "ACTION":
            rec["action"] = str(rest[0])
        elif key in STRING_PROPS:
            val = rest[0] if rest else None
            if isinstance(val, str) and not isinstance(val, Sym):
                rec[STRING_PROPS[key]] = normalize_text(val)
            elif isinstance(val, Sym):
                # e.g. (LDESC <routine>) — a computed description. Record the
                # routine so the port knows a hand-written description is owed.
                rec[STRING_PROPS[key] + "Fcn"] = str(val)
        elif key in INT_PROPS:
            if rest and isinstance(rest[0], int):
                rec[INT_PROPS[key]] = rest[0]
        elif key == "DESCFCN":
            rec["descFcn"] = str(rest[0])
        elif key == "CONTFCN":
            rec["contFcn"] = str(rest[0])
        elif key == "VTYPE":
            rec["vtype"] = [str(v) for v in rest]

    if is_room:
        out = {
            "exits": exits,
            "flags": flags,
            "globals": globals_,
            "pseudo": pseudo,
        }
        # `in` on a room is always ROOMS; the engine does not use it.
        rec.pop("in", None)
        out.update(rec)
        return kind, name, out

    out = {"flags": flags, "synonyms": synonyms, "adjectives": adjectives}
    out.update(rec)
    return kind, name, out


def extract(game: int) -> dict[str, Any]:
    cfg = GAMES[game]
    rooms: dict[str, Any] = {}
    objects: dict[str, Any] = {}
    for fname in cfg["files"]:
        path = os.path.join(ROOT, cfg["source"], fname)
        with open(path, encoding="latin-1") as fh:
            text = fh.read()
        for datum in read_datums(text):
            if not isinstance(datum, Form) or len(datum) < 2:
                continue
            if str(datum[0]) not in ("ROOM", "OBJECT"):
                continue
            kind, name, rec = translate(datum)
            (rooms if kind == "ROOM" else objects)[name] = rec
    return {"rooms": rooms, "objects": objects}


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def normalize_for_diff(data: dict[str, Any]) -> dict[str, Any]:
    """Drop keys the old extractor never emitted, so --check compares like
    with like."""
    extra = {"ldescFcn", "descFcn", "contFcn", "vtype", "fdescFcn", "textFcn"}
    out: dict[str, Any] = {"rooms": {}, "objects": {}}
    for cat in ("rooms", "objects"):
        for name, rec in data[cat].items():
            out[cat][name] = {k: v for k, v in rec.items() if k not in extra}
    return out


# Differences between this extractor and the Zork I data shipped in July 2026
# that are known and intended, so --check can still act as a gate:
#
#  - Every room in the committed data carries a spurious empty `IN` exit. The
#    old extractor read each room's `(IN ROOMS)` containment declaration as an
#    IN *direction*. 105 of 110 Zork I rooms were affected, and because an
#    empty exit object is truthy, typing IN in any of them walked the player
#    into `undefined` and crashed the engine.
#  - The old extractor dropped a handful of zero/placeholder property values on
#    ZIL's internal bookkeeping objects. These are never displayed.
KNOWN_DELTAS = {
    ("objects", "ADVENTURER", "strength"),
    ("objects", "LOCAL-GLOBALS", "capacity"),
    ("objects", "LOCAL-GLOBALS", "size"),
    ("objects", "LOCAL-GLOBALS", "fdesc"),
}


def check(game: int) -> int:
    """Diff freshly extracted data against the committed JSON."""
    legacy_path = os.path.join(ROOT, "game/src/data/world.gen.json")
    path = os.path.join(ROOT, GAMES[game]["out"])
    if not os.path.exists(path) and game == 1 and os.path.exists(legacy_path):
        path = legacy_path
    if not os.path.exists(path):
        print(f"no committed JSON at {path}")
        return 1
    with open(path) as fh:
        old = json.load(fh)
    new = normalize_for_diff(extract(game))

    legacy_in = 0
    for rec in old["rooms"].values():
        if rec.get("exits", {}).get("IN") == {}:
            del rec["exits"]["IN"]
            legacy_in += 1

    diffs = 0
    for cat in ("rooms", "objects"):
        only_old = set(old[cat]) - set(new[cat])
        only_new = set(new[cat]) - set(old[cat])
        if only_old:
            print(f"  {cat}: only in committed ({len(only_old)}): {sorted(only_old)[:8]}")
            diffs += len(only_old)
        if only_new:
            print(f"  {cat}: only in extracted ({len(only_new)}): {sorted(only_new)[:8]}")
            diffs += len(only_new)
        for name in sorted(set(old[cat]) & set(new[cat])):
            o, nw = old[cat][name], new[cat][name]
            for key in sorted(set(o) | set(nw)):
                if o.get(key) == nw.get(key) or (cat, name, key) in KNOWN_DELTAS:
                    continue
                print(f"  {cat}/{name}.{key}:\n      committed: {o.get(key)!r}\n      extracted: {nw.get(key)!r}")
                diffs += 1

    if legacy_in:
        print(f"  (ignored {legacy_in} spurious empty IN exits in the committed data — see KNOWN_DELTAS)")
    print(f"Zork {game}: {'OK' if diffs == 0 else str(diffs) + ' unexpected difference(s)'}")
    return 0 if diffs == 0 else 1


def write(game: int) -> None:
    data = extract(game)
    out_path = os.path.join(ROOT, GAMES[game]["out"])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as fh:
        json.dump(data, fh, indent=1, sort_keys=False)
        fh.write("\n")
    print(f"Zork {game}: {len(data['rooms'])} rooms, {len(data['objects'])} objects -> {GAMES[game]['out']}")


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if not a.startswith("-")]
    games = [int(a) for a in args] if args else [1, 2, 3]
    if "--check" in argv:
        return max(check(g) for g in games)
    for g in games:
        write(g)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
