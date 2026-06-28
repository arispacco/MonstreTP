#!/usr/bin/env python3
import sys
import os
import json
import urllib.request
import urllib.error
import subprocess
import re

def get_git_remote_info():
    try:
        url = subprocess.check_output(["git", "remote", "get-url", "origin"], stderr=subprocess.DEVNULL).decode().strip()
        # Parse git@github.com:owner/repo.git or https://github.com/owner/repo.git
        match = re.search(r"github\.com[:/]([^/]+)/([^.]+)", url)
        if match:
            return match.group(1), match.group(2)
    except Exception:
        pass
    return None, None

def get_current_branch():
    try:
        return subprocess.check_output(["git", "branch", "--show-current"], stderr=subprocess.DEVNULL).decode().strip()
    except Exception:
        return "main"

def make_request(url, token=None):
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "Antigravity-CI-Helper")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.read(), response.status
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')
        print(f"Error calling {url}: {e.code} - {e.reason}\nBody: {body}", file=sys.stderr)
        raise e

def main():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    owner, repo = get_git_remote_info()
    
    if not owner or not repo:
        print("Error: Could not determine GitHub repository owner and name from git remote.", file=sys.stderr)
        sys.exit(1)
        
    branch = get_current_branch()
    print(f"Repository: {owner}/{repo} (Branch: {branch})")
    
    # 1. Fetch latest runs
    # We query runs for this branch
    runs_url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs?branch={branch}&per_page=5"
    try:
        data, _ = make_request(runs_url, token)
        runs_json = json.loads(data.decode('utf-8'))
    except Exception as e:
        print(f"Failed to fetch runs: {e}", file=sys.stderr)
        sys.exit(1)
        
    runs = runs_json.get("workflow_runs", [])
    if not runs:
        # Fallback: fetch general runs
        runs_url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page=5"
        try:
            data, _ = make_request(runs_url, token)
            runs_json = json.loads(data.decode('utf-8'))
            runs = runs_json.get("workflow_runs", [])
        except Exception as e:
            print(f"Failed to fetch general runs: {e}", file=sys.stderr)
            sys.exit(1)
            
    if not runs:
        print("No workflow runs found.", file=sys.stderr)
        sys.exit(1)
        
    # Find the latest failed run
    failed_run = None
    for r in runs:
        if r.get("conclusion") == "failure" or r.get("status") == "completed" and r.get("conclusion") != "success":
            failed_run = r
            break
            
    if not failed_run:
        print("No failed workflow runs found in the recent history.")
        # Print the latest run status instead
        latest = runs[0]
        print(f"Latest run #{latest.get('run_number')} status: {latest.get('status')}, conclusion: {latest.get('conclusion')}")
        sys.exit(0)
        
    run_id = failed_run.get("id")
    print(f"Found failed run #{failed_run.get('run_number')} (ID: {run_id}) on workflow '{failed_run.get('name')}'")
    
    # 2. Get jobs for this run
    jobs_url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
    try:
        data, _ = make_request(jobs_url, token)
        jobs_json = json.loads(data.decode('utf-8'))
    except Exception as e:
        print(f"Failed to fetch jobs for run {run_id}: {e}", file=sys.stderr)
        sys.exit(1)
        
    jobs = jobs_json.get("jobs", [])
    failed_job = None
    for j in jobs:
        if j.get("conclusion") == "failure":
            failed_job = j
            break
            
    if not failed_job:
        print("Failed run found, but couldn't identify the failed job. Defaulting to first job.")
        if jobs:
            failed_job = jobs[0]
        else:
            sys.exit(1)
            
    job_id = failed_job.get("id")
    print(f"Failed Job: {failed_job.get('name')} (ID: {job_id})")
    
    # Identify failed step
    failed_step = None
    for step in failed_job.get("steps", []):
        if step.get("conclusion") == "failure":
            failed_step = step
            break
            
    if failed_step:
        print(f"Failed Step: {failed_step.get('name')} (Step Number: {failed_step.get('number')})")
    else:
        print("No specific failed step found in job steps list.")
        
    # 3. Download job logs
    log_url = f"https://api.github.com/repos/{owner}/{repo}/actions/jobs/{job_id}/logs"
    print(f"Downloading logs for job {job_id}...")
    try:
        log_data, _ = make_request(log_url, token)
        log_text = log_data.decode('utf-8', errors='replace')
    except Exception as e:
        print(f"Failed to download logs (you might need GITHUB_TOKEN for log access): {e}", file=sys.stderr)
        sys.exit(1)
        
    # Parse logs to extract the failed step section if we identified one
    log_lines = log_text.splitlines()
    failed_step_lines = []
    
    if failed_step:
        step_name = failed_step.get("name")
        # Try to find the section matching the step
        # GitHub Action logs format step starts like:
        # timestamp ##[group]Run actions/checkout@v4
        # or timestamp ##[group]Build Release APK
        # and ends with ##[endgroup]
        in_failed_step = False
        step_pattern = re.compile(rf"##\[group\].*{re.escape(step_name)}", re.IGNORECASE)
        any_group_pattern = re.compile(r"##\[group\]")
        
        for line in log_lines:
            if step_pattern.search(line):
                in_failed_step = True
                failed_step_lines.append(line)
                continue
            elif in_failed_step and any_group_pattern.search(line):
                # We entered another step group, so the failed step logs are done
                break
            
            if in_failed_step:
                failed_step_lines.append(line)
                
        # If we failed to find the step by name, fallback to the end of the log
        if not failed_step_lines:
            print("Step markers not found in log. Falling back to the end of the job log.")
            failed_step_lines = log_lines
    else:
        failed_step_lines = log_lines
        
    # Extract last 50 lines
    last_50 = failed_step_lines[-50:]
    
    print("\n--- [FAILED STEP LOGS - LAST 50 LINES] ---")
    for line in last_50:
        # Strip timestamp prefix if possible (e.g. 2026-06-28T22:31:08.1234567Z )
        clean_line = re.sub(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*", "", line)
        print(clean_line)
    print("-------------------------------------------\n")
    
    # Save full failed step log to a file for deeper analysis if the agent needs it
    out_file = "ci_failed_step_log.txt"
    try:
        with open(out_file, "w") as f:
            f.write("\n".join(failed_step_lines))
        print(f"Full failed step log written to: {out_file}")
    except Exception as e:
        print(f"Could not save logs to {out_file}: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
