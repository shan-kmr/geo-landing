#!/bin/bash
# Auto-deploy watcher for public/interview.
# Polls for saved changes under this directory; on change: debounce, commit (scoped
# to this path only), and publish to the gh-pages branch under /interview via
# `gh-pages --add`, which leaves the rest of the site untouched.
set -u
cd "$(cd "$(dirname "$0")/../.." && pwd)" || exit 1
SCOPE="public/interview"
echo "watching $SCOPE (repo: $(pwd)); ctrl-c to stop"
while true; do
  if [[ -n $(git status --porcelain -- "$SCOPE") ]]; then
    sleep 8   # debounce: let the save settle
    if [[ -n $(git status --porcelain -- "$SCOPE") ]]; then
      git add "$SCOPE"
      git commit -q -m "interview: auto-deploy $(date '+%Y-%m-%d %H:%M:%S')

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" -- "$SCOPE"
      if npx gh-pages -d "$SCOPE" --dest interview --add -m "deploy: interview [skip ci]" >/dev/null 2>&1; then
        echo "$(date '+%H:%M:%S') deployed -> https://shan-kmr.github.io/geo-landing/interview/"
      else
        echo "$(date '+%H:%M:%S') DEPLOY FAILED (commit kept; retrying on next change)"
      fi
    fi
  fi
  sleep 5
done
