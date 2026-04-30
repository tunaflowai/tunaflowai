---
name: audio-media-processor
version: 0.2.0
description: Prepares FFmpeg conversions, audio waveform images, and approval-gated media uploads.
triggers:
- folder-watcher
- media.file_added
- user.message
tools:
- convert_audio_format
- generate_audio_waveform
- auto_upload_media
personas:
- operator
- research-analyst
jobs:
- audio-media-processor
- studio-assistant
risk: high
maxContextChars: 3200
---
# Audio and Media Processor

Use for WAV/MP3 conversion, waveform image generation, and media package preparation. Heavy conversion should run as a local command.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.
