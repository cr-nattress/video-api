#!/bin/bash

# Load environment variables from .env
set -a
source .env
set +a

# Video ID from the previous test
# Update this with the actual video ID you want to check
VIDEO_ID=${1:-"video_68f6fd9bfb448198ae614359945657d20dfcf6fb55d74995"}

echo "Checking video status..."
echo "Video ID: $VIDEO_ID"
echo "API Key (first 10 chars): ${OPENAI_API_KEY:0:10}..."
echo ""

curl https://api.openai.com/v1/videos/$VIDEO_ID \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json"

echo ""
echo ""
echo "=== Status check completed ==="
