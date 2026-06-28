---
name: fetch-failed-ci-step
description: >-
  Extracts the specific failed step name and the last 50 lines of logs for that step from the latest failed GitHub Actions run to avoid token blowout.
---

# Fetch Failed CI Step

## Overview
This skill provides a programmatic way for the agent to retrieve only the relevant portion of a failed GitHub Actions run. Instead of fetching the entire logs (which easily causes token context window crashes), it parses the API responses to extract the name, step index, and the last 50 lines of error logs from the failed step.

## Dependencies
- GitHub repository must have actions enabled.
- Uses `fetch_failed_step.py` helper script (Python 3 stdlib).
- If the repository is private, you must export `GITHUB_TOKEN` or `GH_TOKEN`. For public repositories (like `arispacco/MonstreTP`), it works out of the box with public API endpoints.

## Quick Start
Run the helper script using python:
```bash
python3 .agents/skills/fetch-failed-ci-step/fetch_failed_step.py
```

## Utility Scripts

### `fetch_failed_step.py`
This script queries the GitHub REST API to locate the latest run, find which job failed, identify the exact step that failed, download the text logs, isolate the failed step's section, and output the last 50 lines.

#### Outputs
- Prints the last 50 lines to `stdout`.
- Saves the full log of the failed step to `ci_failed_step_log.txt` for further inspection if the agent needs more context.

## Common Mistakes
- **Missing Token for private repos**: Ensure a token is set in `GITHUB_TOKEN` if you encounter a 404/403.
- **Rate limiting**: GitHub Actions API restricts unauthenticated access to 60 requests per hour. If you run it frequently, set a token to get 5000 requests per hour.
