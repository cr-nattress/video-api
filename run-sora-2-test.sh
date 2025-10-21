#!/bin/bash

# Load environment variables from .env
set -a
source .env
set +a

echo "Testing OpenAI Sora 2 API (sora-2)..."
echo "Using model: sora-2"
echo "Prompt: A calico cat playing a piano on stage"
echo "API Key (first 10 chars): ${OPENAI_API_KEY:0:10}..."
echo ""

curl https://api.openai.com/v1/videos \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora-2",
    "prompt": "A calico cat playing a piano on stage"
  }'

echo ""
echo ""
echo "=== Test completed ==="
