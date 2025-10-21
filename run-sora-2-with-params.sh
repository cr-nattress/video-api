#!/bin/bash

# Load environment variables from .env
set -a
source .env
set +a

echo "Testing OpenAI Sora 2 API with various parameters..."
echo "Using model: sora-2"
echo "Prompt: A calico cat playing a piano on stage"
echo ""

echo "=== Test 1: With size and seconds (Sora 2 format) ==="
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2",
    "prompt": "A calico cat playing a piano on stage",
    "size": "1080x1080",
    "seconds": "8"
  }'

echo ""
echo ""

echo "=== Test 2: With width/height (Sora 1 format - should fail) ==="
curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2",
    "prompt": "A calico cat playing a piano on stage",
    "width": 1080,
    "height": 1080
  }'

echo ""
echo ""
echo "=== Tests completed ==="
