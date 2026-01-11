#!/usr/bin/env python3
"""
DevMetrics Hook for Claude Code

A robust telemetry hook that tracks sessions, token usage, and code changes.
Parses Claude Code's JSONL logs to extract accurate token metrics.

Installation:
1. Copy this file to ~/.claude/hooks/devmetrics_hook.py
2. Make executable: chmod +x ~/.claude/hooks/devmetrics_hook.py
3. Set environment variables in your shell profile:
   export DEVMETRICS_URL="http://localhost:3000"
   export DEVMETRICS_API_KEY="your-api-key-here"
4. Configure hooks in ~/.claude/settings.json (see documentation)

Supported hook events:
- SessionStart: Tracks new sessions
- Stop: Parses JSONL logs for token totals, ends session
- PostToolUse: Tracks file changes from Write/Edit tools
"""

import json
import os
import sys
import glob
import hashlib
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

# Configuration
DEVMETRICS_URL = os.environ.get("DEVMETRICS_URL", "http://localhost:3000")
DEVMETRICS_API_KEY = os.environ.get("DEVMETRICS_API_KEY", "")
DEBUG = os.environ.get("DEVMETRICS_DEBUG", "").lower() in ("1", "true", "yes")

# Session state file - stores mapping between Claude session IDs and dashboard session IDs
STATE_FILE = Path.home() / ".claude" / "devmetrics_state.json"


def debug_log(message: str) -> None:
    """Log debug messages if debugging is enabled."""
    if DEBUG:
        timestamp = datetime.now().isoformat()
        log_file = Path.home() / ".claude" / "devmetrics_debug.log"
        try:
            with open(log_file, "a") as f:
                f.write(f"[{timestamp}] {message}\n")
        except Exception:
            pass


def load_state() -> Dict[str, Any]:
    """Load persisted state from file."""
    try:
        if STATE_FILE.exists():
            with open(STATE_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        debug_log(f"Failed to load state: {e}")
    return {"sessions": {}, "processed_entries": []}


def save_state(state: Dict[str, Any]) -> None:
    """Save state to file."""
    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        debug_log(f"Failed to save state: {e}")


def send_event(event_type: str, data: Dict[str, Any]) -> Tuple[bool, Optional[Dict]]:
    """
    Send an event to the DevMetrics API.

    Returns (success, response_data) tuple.
    """
    if not DEVMETRICS_API_KEY:
        debug_log("No API key configured, skipping event")
        return False, None

    url = f"{DEVMETRICS_URL}/api/v1/ingest"
    payload = json.dumps({"event": event_type, "data": data}).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "X-API-Key": DEVMETRICS_API_KEY,
        "User-Agent": "DevMetrics-Hook/2.0",
    }

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            response_data = json.loads(resp.read().decode("utf-8"))
            debug_log(f"Event sent successfully: {event_type} -> {response_data}")
            return True, response_data
    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode("utf-8")
            debug_log(f"HTTP error {e.code}: {error_body}")
        except Exception:
            debug_log(f"HTTP error {e.code}")
        return False, None
    except urllib.error.URLError as e:
        debug_log(f"URL error: {e.reason}")
        return False, None
    except Exception as e:
        debug_log(f"Request error: {e}")
        return False, None


def find_jsonl_files() -> List[Path]:
    """
    Find Claude Code's JSONL log files.

    Claude Code stores conversation logs in:
    - ~/.config/claude/projects/<project-hash>/*.jsonl
    - ~/.claude/projects/<project-hash>/*.jsonl
    """
    search_paths = []

    # Check environment variable first
    if config_dir := os.environ.get("CLAUDE_CONFIG_DIR"):
        for path in config_dir.split(","):
            search_paths.append(Path(path.strip()) / "projects")

    # Default locations
    search_paths.extend([
        Path.home() / ".config" / "claude" / "projects",
        Path.home() / ".claude" / "projects",
    ])

    jsonl_files = []
    for base_path in search_paths:
        if base_path.exists():
            # Find all .jsonl files recursively
            for jsonl_file in base_path.rglob("*.jsonl"):
                jsonl_files.append(jsonl_file)

    # Sort by modification time (newest first)
    jsonl_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    debug_log(f"Found {len(jsonl_files)} JSONL files")
    return jsonl_files


def parse_jsonl_for_tokens(jsonl_file: Path, after_timestamp: Optional[float] = None) -> Dict[str, Any]:
    """
    Parse a JSONL file to extract token usage metrics.

    Returns aggregated token counts from all entries after the given timestamp.
    """
    totals = {
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 0,
        "model": None,
        "entries_processed": 0,
        "latest_timestamp": None,
    }

    try:
        with open(jsonl_file, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # Check timestamp filter
                entry_timestamp = entry.get("timestamp")
                if entry_timestamp and after_timestamp:
                    try:
                        entry_time = datetime.fromisoformat(entry_timestamp.replace("Z", "+00:00")).timestamp()
                        if entry_time <= after_timestamp:
                            continue
                    except Exception:
                        pass

                # Extract usage data from the entry
                # Format: {"type": "assistant", "message": {"usage": {...}}}
                message = entry.get("message", {})
                usage = message.get("usage", {})

                if usage:
                    totals["input_tokens"] += usage.get("input_tokens", 0)
                    totals["output_tokens"] += usage.get("output_tokens", 0)
                    totals["cache_creation_tokens"] += usage.get("cache_creation_input_tokens", 0)
                    totals["cache_read_tokens"] += usage.get("cache_read_input_tokens", 0)
                    totals["entries_processed"] += 1

                    # Track model from message
                    if model := message.get("model"):
                        totals["model"] = model

                    # Track latest timestamp
                    if entry_timestamp:
                        totals["latest_timestamp"] = entry_timestamp

    except Exception as e:
        debug_log(f"Error parsing JSONL file {jsonl_file}: {e}")

    return totals


def get_session_tokens(session_id: str, state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get token usage for a session by parsing recent JSONL files.

    Uses the session start time to filter entries.
    """
    session_data = state.get("sessions", {}).get(session_id, {})
    start_timestamp = session_data.get("start_timestamp")

    jsonl_files = find_jsonl_files()

    aggregated = {
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 0,
        "model": None,
    }

    # Parse the most recent JSONL files (limit to avoid parsing old history)
    for jsonl_file in jsonl_files[:5]:
        tokens = parse_jsonl_for_tokens(jsonl_file, start_timestamp)
        aggregated["input_tokens"] += tokens["input_tokens"]
        aggregated["output_tokens"] += tokens["output_tokens"]
        aggregated["cache_creation_tokens"] += tokens["cache_creation_tokens"]
        aggregated["cache_read_tokens"] += tokens["cache_read_tokens"]

        if tokens["model"]:
            aggregated["model"] = tokens["model"]

    debug_log(f"Session {session_id} tokens: {aggregated}")
    return aggregated


def handle_session_start(input_data: Dict[str, Any], state: Dict[str, Any]) -> None:
    """Handle SessionStart hook event."""
    session_id = input_data.get("session_id", "")
    cwd = input_data.get("cwd", "")
    project_name = os.path.basename(cwd) if cwd else None

    debug_log(f"SessionStart: {session_id}, project: {project_name}")

    # Send session start event
    success, response = send_event("session_start", {
        "tool": "claude_code",
        "projectName": project_name,
        "externalSessionId": session_id,
        "metadata": {
            "cwd": cwd,
            "hookVersion": "2.0",
        },
    })

    if success and response:
        # Store mapping between Claude session ID and dashboard session ID
        dashboard_session_id = response.get("id")
        state.setdefault("sessions", {})[session_id] = {
            "dashboard_id": dashboard_session_id,
            "start_timestamp": datetime.now().timestamp(),
            "project_name": project_name,
            "cwd": cwd,
        }
        save_state(state)
        debug_log(f"Session mapped: {session_id} -> {dashboard_session_id}")


def handle_stop(input_data: Dict[str, Any], state: Dict[str, Any]) -> None:
    """
    Handle Stop hook event.

    This is the most important hook - it parses JSONL logs to get accurate
    token usage for the session that just ended.
    """
    session_id = input_data.get("session_id", "")

    debug_log(f"Stop: session {session_id}")

    # Get session data from state
    session_data = state.get("sessions", {}).get(session_id, {})
    dashboard_session_id = session_data.get("dashboard_id")

    # Parse JSONL logs for token usage
    tokens = get_session_tokens(session_id, state)

    # Only send if we have token data
    if tokens["input_tokens"] > 0 or tokens["output_tokens"] > 0:
        # Calculate duration
        start_timestamp = session_data.get("start_timestamp")
        duration_minutes = None
        if start_timestamp:
            duration_minutes = int((datetime.now().timestamp() - start_timestamp) / 60)

        # Send session end with token totals
        success, _ = send_event("session_end", {
            "sessionId": dashboard_session_id,
            "externalSessionId": session_id,
            "durationMinutes": duration_minutes,
            "totalInputTokens": tokens["input_tokens"],
            "totalOutputTokens": tokens["output_tokens"],
            "totalCacheReadTokens": tokens["cache_read_tokens"],
            "totalCacheWriteTokens": tokens["cache_creation_tokens"],
            "model": tokens["model"],
        })

        if success:
            debug_log(f"Session ended with {tokens['input_tokens']} input, {tokens['output_tokens']} output tokens")
    else:
        # Still end the session even without token data
        send_event("session_end", {
            "sessionId": dashboard_session_id,
            "externalSessionId": session_id,
        })
        debug_log("Session ended without token data (no JSONL entries found)")

    # Clean up session from state
    if session_id in state.get("sessions", {}):
        del state["sessions"][session_id]
        save_state(state)


def handle_post_tool_use(input_data: Dict[str, Any], state: Dict[str, Any]) -> None:
    """Handle PostToolUse hook event for tracking code changes."""
    tool_name = input_data.get("tool_name", "")
    tool_response = input_data.get("tool_response", {})
    session_id = input_data.get("session_id", "")
    cwd = input_data.get("cwd", "")

    # Only track Write and Edit tools
    if tool_name not in ("Write", "Edit"):
        return

    # Check if tool succeeded
    if not tool_response.get("success", True):
        return

    debug_log(f"PostToolUse: {tool_name} in session {session_id}")

    # Get session mapping
    session_data = state.get("sessions", {}).get(session_id, {})
    dashboard_session_id = session_data.get("dashboard_id")

    # Estimate lines based on tool type
    lines_added = 1 if tool_name == "Write" else 0
    lines_modified = 1 if tool_name == "Edit" else 0

    # Try to get file info from tool input
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    # Detect language from file extension
    language = None
    if file_path:
        ext = os.path.splitext(file_path)[1].lower()
        language_map = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".jsx": "javascript",
            ".go": "go",
            ".rs": "rust",
            ".java": "java",
            ".rb": "ruby",
            ".php": "php",
            ".c": "c",
            ".cpp": "cpp",
            ".h": "c",
            ".hpp": "cpp",
            ".cs": "csharp",
            ".swift": "swift",
            ".kt": "kotlin",
            ".scala": "scala",
            ".sh": "shell",
            ".bash": "shell",
            ".zsh": "shell",
            ".sql": "sql",
            ".html": "html",
            ".css": "css",
            ".scss": "scss",
            ".json": "json",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".md": "markdown",
            ".xml": "xml",
        }
        language = language_map.get(ext)

    project_name = os.path.basename(cwd) if cwd else None

    send_event("code_change", {
        "sessionId": dashboard_session_id,
        "externalSessionId": session_id,
        "linesAdded": lines_added,
        "linesModified": lines_modified,
        "linesDeleted": 0,
        "filesChanged": 1,
        "language": language,
        "repository": project_name,
    })


def main():
    """Main entry point for the hook."""
    # Read input from stdin
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        debug_log(f"Failed to parse stdin: {e}")
        sys.exit(0)
    except Exception as e:
        debug_log(f"Error reading stdin: {e}")
        sys.exit(0)

    # Load persisted state
    state = load_state()

    # Get hook event type
    hook_event = input_data.get("hook_event_name", "")

    debug_log(f"Received hook event: {hook_event}")

    # Route to appropriate handler
    if hook_event == "SessionStart":
        handle_session_start(input_data, state)
    elif hook_event == "Stop":
        handle_stop(input_data, state)
    elif hook_event == "PostToolUse":
        handle_post_tool_use(input_data, state)
    else:
        debug_log(f"Unhandled hook event: {hook_event}")

    # Always exit successfully to not block Claude Code
    sys.exit(0)


if __name__ == "__main__":
    main()
