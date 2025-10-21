#!/bin/bash

# Load environment variables from .env
set -a
source .env
set +a

# Video ID from the previous test
VIDEO_ID=${1:-"video_68f6fd9bfb448198ae614359945657d20dfcf6fb55d74995"}
OUTPUT_FILE=${2:-"output_${VIDEO_ID}.mp4"}

echo "Downloading video..."
echo "Video ID: $VIDEO_ID"
echo "Output file: $OUTPUT_FILE"
echo "API Key (first 10 chars): ${OPENAI_API_KEY:0:10}..."
echo ""

curl https://api.openai.com/v1/videos/$VIDEO_ID/content \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  --output "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
  FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo ""
  echo "✅ Video downloaded successfully!"
  echo "File: $OUTPUT_FILE"
  echo "Size: $FILE_SIZE"
else
  echo ""
  echo "❌ Download failed!"
fi

echo ""
echo "=== Download completed ==="
