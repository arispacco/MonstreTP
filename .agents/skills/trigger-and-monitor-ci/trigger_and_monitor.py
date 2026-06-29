#!/usr/bin/env python3
import sys
import os
import json
import time
import urllib.request
import urllib.error
import subprocess
import re
from datetime import datetime

def run_cmd(args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        return None, result.stderr.decode().strip()
    return result.stdout.decode().strip(), None

def get_git_remote_info():
    url, _ = run_cmd(["git", "remote", "get-url", "origin"])
    if url:
        match = re.search(r"github\.com[:/]([^/]+)/([^.]+)", url)
        if match:
            return match.group(1), match.group(2)
    return None, None

def get_current_branch():
    branch, _ = run_cmd(["git", "branch", "--show-current"])
    return branch or "main"

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

def setup_ssh_agent():
    askpass_path = "/tmp/git_askpass.sh"
    try:
        with open(askpass_path, "w") as f:
            f.write("#!/bin/sh\necho ok\n")
        os.chmod(askpass_path, 0o755)
        
        agent_out = subprocess.check_output(["ssh-agent", "-s"]).decode()
        for line in agent_out.split(";"):
            if "SSH_AUTH_SOCK=" in line:
                val = line.split("=")[1].split()[0]
                os.environ["SSH_AUTH_SOCK"] = val
            if "SSH_AGENT_PID=" in line:
                val = line.split("=")[1].split()[0]
                os.environ["SSH_AGENT_PID"] = val
                
        env = os.environ.copy()
        env["SSH_ASKPASS"] = askpass_path
        env["SSH_ASKPASS_REQUIRE"] = "force"
        
        with open(os.devnull, 'r') as devnull:
            subprocess.run(["ssh-add"], env=env, stdin=devnull, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"Warning: Failed to set up ssh-agent: {e}", file=sys.stderr)

def main():
    setup_ssh_agent()
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    owner, repo = get_git_remote_info()
    
    if not owner or not repo:
        print("Error: Could not determine GitHub repository owner and name.", file=sys.stderr)
        sys.exit(1)
        
    branch = get_current_branch()
    print(f"Repository: {owner}/{repo}")
    print(f"Current Branch: {branch}")
    
    # 1. Commit modifications
    status, _ = run_cmd(["git", "status", "--porcelain"])
    if status:
        print("Local changes detected. Staging and committing...")
        _, err = run_cmd(["git", "add", "."])
        if err:
            print(f"Failed to stage changes: {err}", file=sys.stderr)
            sys.exit(1)
            
        commit_msg = f"chore: CI debug push - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        out, err = run_cmd(["git", "commit", "-m", commit_msg])
        if err:
            print(f"Failed to commit: {err}", file=sys.stderr)
            sys.exit(1)
        print(f"Committed successfully: '{commit_msg}'")
    else:
        print("No local changes to commit.")
        
    # 2. Push to remote
    print(f"Pushing changes to origin/{branch}...")
    _, err = run_cmd(["git", "push", "origin", branch])
    if err:
        print(f"Failed to push: {err}", file=sys.stderr)
        print("Please ensure your SSH keys are set up or you have push access.", file=sys.stderr)
        sys.exit(1)
    print("Push completed successfully!")
    
    # Give GitHub a few seconds to register the webhook and trigger the run
    print("Waiting 6 seconds for GitHub to trigger the workflow run...")
    time.sleep(6)
    
    # 3. Find the run ID
    runs_url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs?branch={branch}&per_page=5"
    run_id = None
    try:
        data, _ = make_request(runs_url, token)
        runs = json.loads(data.decode('utf-8')).get("workflow_runs", [])
    except Exception as e:
        print(f"Failed to fetch runs: {e}", file=sys.stderr)
        sys.exit(1)
        
    if not runs:
        print("Error: No runs triggered on this branch.", file=sys.stderr)
        sys.exit(1)
        
    # Pick the latest run (typically index 0 since they are sorted newest first)
    latest_run = runs[0]
    run_id = latest_run.get("id")
    run_url = latest_run.get("html_url")
    print(f"Monitoring Run #{latest_run.get('run_number')} (ID: {run_id})")
    print(f"Run Link: {run_url}")
    
    # 4. Monitor the run
    timeout_minutes = 15
    poll_interval_seconds = 15
    start_time = time.time()
    
    print("\nStarting monitoring loop (polling every 15s)...")
    while True:
        elapsed = (time.time() - start_time) / 60
        if elapsed > timeout_minutes:
            print(f"\nTimeout reached after {timeout_minutes} minutes. Monitoring stopped.", file=sys.stderr)
            sys.exit(1)
            
        # Get run status
        status_url = f"https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}"
        try:
            data, _ = make_request(status_url, token)
            run_data = json.loads(data.decode('utf-8'))
        except Exception as e:
            print(f"Error fetching run status: {e}", file=sys.stderr)
            time.sleep(poll_interval_seconds)
            continue
            
        status = run_data.get("status")
        conclusion = run_data.get("conclusion")
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        print(f"[{timestamp}] Status: {status} | Conclusion: {conclusion or 'Running...'}")
        
        if status == "completed":
            if conclusion == "success":
                print("\n✅ CI/CD BUILD SUCCESSFUL!")
                sys.exit(0)
            else:
                print(f"\n❌ CI/CD BUILD COMPLETED WITH CONCLUSION: {conclusion}")
                
                # Automatically trigger logs fetching
                print("Triggering automatic log analysis...")
                skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                fetch_script = os.path.join(skill_dir, "fetch-failed-ci-step", "fetch_failed_step.py")
                if os.path.exists(fetch_script):
                    subprocess.run([sys.executable, fetch_script])
                else:
                    print(f"Error: Log fetcher script not found at {fetch_script}", file=sys.stderr)
                sys.exit(2)
                
        time.sleep(poll_interval_seconds)

if __name__ == "__main__":
    main()
