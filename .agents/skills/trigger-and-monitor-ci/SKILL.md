---
name: trigger-and-monitor-ci
description: >-
  Commits local changes, pushes them to the current Git branch, and monitors the GitHub Actions build progress in real-time, calling log fetcher on failure.
---

# Trigger and Monitor CI

## Overview
This skill automates the testing loop for CI/CD changes. Instead of manually committing, pushing, and refreshing the GitHub website to see if a run passes or fails (which is slow and error-prone), this skill commits local changes, pushes to remote, and monitors the newly triggered workflow run in real-time. If it fails, it automatically retrieves the failure logs.

## Dependencies
- Must have push permissions to origin.
- Uses `trigger_and_monitor.py` helper script (Python 3 stdlib).
- Relies on the `fetch-failed-ci-step` skill to fetch logs on failure.
- Export `GITHUB_TOKEN` or `GH_TOKEN` if rate limit issues or private repository access is needed.

## Quick Start
Run the helper script using python:
```bash
python3 .agents/skills/trigger-and-monitor-ci/trigger_and_monitor.py
```

## Utility Scripts

### `trigger_and_monitor.py`
This script checks `git status`, commits changes automatically if any exist, pushes to the remote branch, waits for GitHub Actions to trigger the run, polls the status of the run every 15 seconds, and handles completion.

#### Behaviors:
- **Automatic logs on failure**: If the run fails, this script automatically executes the `fetch-failed-ci-step` skill script to display the exact failed log lines inside the console output.
- **Timeout**: Stops monitoring after 7 minutes (default) to prevent hanging.

## Common Mistakes
- **No changes to commit**: If there are no modified files, it will skip commit and only trigger push/monitoring.
- **SSH Key issues**: Make sure your local terminal environment can push to GitHub without prompting for passwords if running non-interactively.
