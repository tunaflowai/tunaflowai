---
name: music-ar-playlist-pitcher
version: 0.2.0
description: Checks release availability drafts, writes curator pitches, and prepares artist profile claim workflows.
triggers:
- new-release-schedule-watcher
- music.release
- user.message
tools:
- check_store_availability
- pitch_to_curators
- claim_artist_profile
personas:
- operator
- research-analyst
jobs:
- music-ar
- playlist-pitcher
risk: high
maxContextChars: 3200
---
# Music A&R and Playlist Pitcher

Use for release promotion and curator outreach. Bulk emails or form submissions require approval and anti-spam safeguards.

Workflow:
1. Understand the current event, connector availability, and risk level.
2. Use read-only or draft tools first.
3. Route medium, high, and critical actions through approvals before live execution.
4. Report what was checked, what was changed, and what still needs a command or connector.
