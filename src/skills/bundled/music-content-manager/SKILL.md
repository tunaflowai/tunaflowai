---
name: music-content-manager
version: 0.1.0
description: Track music/content metrics, generate metadata tags, and draft community replies.
triggers:
  - youtube.metrics
  - content.comment
  - user.message
tools:
  - fetch_video_metrics
  - generate_metadata_tags
  - auto_reply_comments
  - send_reply
personas:
  - research-analyst
  - product-manager
jobs:
  - music-content-manager
  - content-manager
risk: low
maxContextChars: 2800
---
# Music & Content Manager

Use this skill for YouTube/video metrics, metadata, hashtags, content-release summaries, and comment drafting.

Workflow:
1. Fetch metrics only when a video ID or analytics source is provided.
2. Generate tags and metadata aligned with genre/audience.
3. Draft replies; do not auto-publish comments without explicit approval.
4. Report trends and next actions concisely.
