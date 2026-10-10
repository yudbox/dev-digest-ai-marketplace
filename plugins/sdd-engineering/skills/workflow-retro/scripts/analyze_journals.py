#!/usr/bin/env python3
"""Summarize a Claude Code session transcript for /workflow-retro.

Read-only: parses the session's JSONL transcript and its subagent
transcripts, prints one JSON document to stdout. Writes nothing, no
network access, standard library only.

Layout read (Claude Code >= 2.1):
  ~/.claude/projects/<encoded-cwd>/<session-id>.jsonl                 main session
  ~/.claude/projects/<encoded-cwd>/<session-id>/subagents/agent-<id>.jsonl
  ~/.claude/projects/<encoded-cwd>/<session-id>/subagents/agent-<id>.meta.json
      {"agentType": "...", "description": "...", "spawnDepth": 1, ...}

Usage:
  python3 analyze_journals.py                      # latest session of the current project
  python3 analyze_journals.py --session <path.jsonl|session-id>
  python3 analyze_journals.py --project-dir <dir>  # pick latest session from that project dir

Output (stdout, JSON):
  {"session": {...}, "agents": [ {...}, ... ], "totals": {...}, "warnings": [...]}
Each row: id, role, depth, model, in, out, cache_read, cache_creation,
tools, span_s, first_ts, last_ts, web_search, web_fetch, interrupted.
Costs are NOT computed here — prices live in the skill (Phase 1b).
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

PROJECTS_ROOT = Path.home() / ".claude" / "projects"


def encode_cwd(cwd: str) -> str:
    # Claude Code encodes the project path by replacing path separators and
    # other non-alphanumeric characters with "-".
    return "".join(ch if ch.isalnum() else "-" for ch in cwd)


def latest_jsonl(directory: Path):
    files = [p for p in directory.glob("*.jsonl") if p.is_file()]
    return max(files, key=lambda p: p.stat().st_mtime) if files else None


def resolve_session(args, warnings):
    if args.session:
        candidate = Path(args.session).expanduser()
        if candidate.suffix == ".jsonl" and candidate.is_file():
            return candidate
        matches = list(PROJECTS_ROOT.glob(f"*/{args.session}.jsonl"))
        if matches:
            return matches[0]
        warnings.append(f"session not found: {args.session}")
        return None

    if args.project_dir:
        project = Path(args.project_dir).expanduser()
    else:
        project = PROJECTS_ROOT / encode_cwd(os.getcwd())
        if not project.is_dir():
            warnings.append(f"no transcript dir for cwd ({project.name}); using latest session overall")
            dirs = [d for d in PROJECTS_ROOT.glob("*") if d.is_dir()]
            sessions = [latest_jsonl(d) for d in dirs]
            sessions = [s for s in sessions if s]
            return max(sessions, key=lambda p: p.stat().st_mtime) if sessions else None
    return latest_jsonl(project)


def parse_ts(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def summarize(path: Path, role: str, depth: int, agent_id: str):
    row = {
        "id": agent_id[:8],
        "role": role,
        "depth": depth,
        "model": None,
        "in": 0,
        "out": 0,
        "cache_read": 0,
        "cache_creation": 0,
        "tools": 0,
        "web_search": 0,
        "web_fetch": 0,
        "span_s": None,
        "first_ts": None,
        "last_ts": None,
        "interrupted": False,
    }
    seen_messages = set()
    timestamps = []
    usage_found = False

    with path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            ts = parse_ts(record.get("timestamp"))
            if ts:
                timestamps.append(ts)
            if record.get("type") != "assistant":
                continue
            message = record.get("message") or {}
            row["model"] = row["model"] or message.get("model")
            for block in message.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    row["tools"] += 1
            # One API response is split into several records (one per
            # content block) that repeat the same usage — count it once.
            message_id = message.get("id") or record.get("requestId")
            if message_id in seen_messages:
                continue
            seen_messages.add(message_id)
            usage = message.get("usage")
            if not usage:
                continue
            usage_found = True
            row["in"] += usage.get("input_tokens", 0) or 0
            row["out"] += usage.get("output_tokens", 0) or 0
            row["cache_read"] += usage.get("cache_read_input_tokens", 0) or 0
            row["cache_creation"] += usage.get("cache_creation_input_tokens", 0) or 0
            server_tools = usage.get("server_tool_use") or {}
            row["web_search"] += server_tools.get("web_search_requests", 0) or 0
            row["web_fetch"] += server_tools.get("web_fetch_requests", 0) or 0

    if timestamps:
        row["first_ts"] = min(timestamps).isoformat()
        row["last_ts"] = max(timestamps).isoformat()
        row["span_s"] = round((max(timestamps) - min(timestamps)).total_seconds())
    row["interrupted"] = not usage_found
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--session", help="path to a session .jsonl, or a session id")
    parser.add_argument("--project-dir", help="transcript directory of a project (~/.claude/projects/<encoded>)")
    args = parser.parse_args()

    warnings = []
    session_path = resolve_session(args, warnings)
    if not session_path:
        print(json.dumps({"session": None, "agents": [], "totals": None,
                          "warnings": warnings + ["jsonl not found"]}, indent=2))
        return 0

    session_id = session_path.stem
    main_row = summarize(session_path, "orchestrator (main session)", 0, session_id)

    agents = []
    sub_dir = session_path.parent / session_id / "subagents"
    if sub_dir.is_dir():
        for transcript in sorted(sub_dir.glob("agent-*.jsonl")):
            agent_id = transcript.stem.replace("agent-", "", 1)
            meta_path = transcript.parent / f"{transcript.stem}.meta.json"
            meta = {}
            if meta_path.is_file():
                try:
                    meta = json.loads(meta_path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    warnings.append(f"unreadable meta: {meta_path.name}")
            row = summarize(transcript, meta.get("agentType") or "unknown",
                            int(meta.get("spawnDepth") or 1), agent_id)
            row["description"] = meta.get("description")
            agents.append(row)
    else:
        warnings.append("no subagents directory — session ran no subagents or uses an older layout")

    agents.sort(key=lambda r: r["first_ts"] or "")
    interrupted = [a["id"] for a in agents if a["interrupted"]]
    if interrupted:
        warnings.append(f"partial data — {len(interrupted)} agent(s) without usage: {', '.join(interrupted)}")

    all_rows = [main_row] + agents
    starts = [parse_ts(r["first_ts"]) for r in all_rows if r["first_ts"]]
    ends = [parse_ts(r["last_ts"]) for r in all_rows if r["last_ts"]]
    wall = round((max(ends) - min(starts)).total_seconds()) if starts and ends else None
    agent_span_sum = sum(a["span_s"] or 0 for a in agents)

    totals = {
        "agents": len(agents),
        "in": sum(r["in"] for r in all_rows),
        "out": sum(r["out"] for r in all_rows),
        "cache_read": sum(r["cache_read"] for r in all_rows),
        "cache_creation": sum(r["cache_creation"] for r in all_rows),
        "tools": sum(r["tools"] for r in all_rows),
        "web_search": sum(r["web_search"] for r in all_rows),
        "web_fetch": sum(r["web_fetch"] for r in all_rows),
        "wall_s": wall,
        "parallelism": round(agent_span_sum / wall, 2) if wall else None,
    }

    print(json.dumps({
        "session": {"id": session_id, "path": str(session_path), **{k: main_row[k] for k in
                    ("model", "in", "out", "cache_read", "cache_creation", "tools", "span_s")}},
        "agents": agents,
        "totals": totals,
        "warnings": warnings,
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
