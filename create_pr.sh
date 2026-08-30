#!/bin/bash

# Create PR for gemini model update

# Set environment variables (edit these)
OWNER="JSahlberg42"
REPO="Kiekuu"
GITHUB_TOKEN="YOUR_GITHUB_TOKEN_HERE"
BRANCH="feat/gemini-model-update"
BASE="main"

# Get current commit SHA
COMMIT_SHA=$(git rev-parse HEAD)

# Create PR via GitHub API
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$OWNER/$REPO/pulls \
  -d "{
    \"title\": \"feat: upgrade to Gemini 3.7 Flash model\",
    \"body\": \"## Summary\nUpdate Kiekuu to use Gemini 3.7 Flash (GA Aug 13, 2026) instead of older models (gemini-2.5-flash, gemini-3-flash-preview).\n\n**Changes:**\n- Update aiService.ts model to gemini-3.7-flash\n- Update firebase/functions/index.js model to gemini-3.7-flash\n\n**Why:** Gemini 3.7 Flash is GA, more capable, and successors to previous models.\n\nCloses #??\",
    \"head\": \"$BRANCH\",
    \"base\": \"$BASE\"
  }" | python -c "
import sys, json
data = json.load(sys.stdin)
print(f\"PR created: https://github.com/$OWNER/$REPO/pull/$data[number]\")
print(f\"Title: $data[title]\")
print(f\"Branch: $data[head]\")
"