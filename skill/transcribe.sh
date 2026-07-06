#!/bin/sh
# skill/transcribe.sh — SKILL-01: local transcription with whisper.cpp (NO API key, nothing leaves the Mac).
#
# One-time setup (macOS):
#   brew install whisper-cpp ffmpeg
#   sh "$(brew --prefix)/share/whisper-cpp/models/download-ggml-model.sh" large-v3
#   # (downloads models/ggml-large-v3.bin; or curl it from HF ggerganov/whisper.cpp)
#
# Usage:
#   sh skill/transcribe.sh <audiofile>     # <audiofile> is a filename under audio-src/ (gitignored)
#   -> writes audio-src/<audiofile>.wav (16kHz mono 16-bit) and audio-src/<audiofile>.json
#      (transcript with per-segment detected_language for the Claude structuring step)
#
# Model policy:
#   - ggml-large-v3 is REQUIRED for mixed ES/JA class audio.
#   - Do NOT use tiny/base/small — they garble code-switched ES/JA.
#   - large-v3-turbo is acceptable ONLY if the Mac is memory-constrained.
#   - NEVER pass --translate (we want the original ES/JA text, not an English translation).

set -eu

if [ $# -lt 1 ]; then
  echo "usage: sh skill/transcribe.sh <audiofile-under-audio-src>" >&2
  exit 1
fi

# 1. Normalize audio to whisper.cpp's required input format: 16kHz mono 16-bit WAV.
ffmpeg -y -i "audio-src/$1" -ar 16000 -ac 1 -c:a pcm_s16le "audio-src/$1.wav"

# 2. Transcribe with auto language detection + JSON output (per-segment detected_language).
whisper-cli -m models/ggml-large-v3.bin -f "audio-src/$1.wav" -l auto -oj -of "audio-src/$1"

echo "transcript written: audio-src/$1.json"
