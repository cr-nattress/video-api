#!/bin/bash

# Load environment variables from .env
set -a
source .env
set +a

# Video ID from the previous test
VIDEO_ID=${1:-"video_68f6fd9bfb448198ae614359945657d20dfcf6fb55d74995"}

echo "Polling video status until completion..."
echo "Video ID: $VIDEO_ID"
echo "API Key (first 10 chars): ${OPENAI_API_KEY:0:10}..."
echo ""
echo "Press Ctrl+C to stop polling"
echo ""

MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "=== Attempt $ATTEMPT of $MAX_ATTEMPTS ==="

  RESPONSE=$(curl -s https://api.openai.com/v1/videos/$VIDEO_ID \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json")

  echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"

  # Extract status (using grep and basic parsing)
  STATUS=$(echo "$RESPONSE" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

  echo ""
  echo "Current status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "✅ Video generation completed!"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "❌ Video generation failed!"
    exit 1
  fi

  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    echo "Waiting 10 seconds before next check..."
    echo ""
    sleep 10
  fi
done

echo ""
echo "⚠️  Maximum attempts reached. Video may still be processing."
