---
name: digital-marketer-seo
version: 0.1.0
description: Monitor ads, SEO keywords, campaign CTR/CPC, and draft promotion copy with approval-gated campaign actions.
triggers:
  - ad-platform-watcher
  - weekly-schedule
  - campaign.metrics
  - seo
  - ads
  - keyword
  - user.message
tools:
  - fetch_ad_metrics
  - analyze_keywords
  - generate_ad_copy
  - pause_losing_ads
  - send_reply
personas:
  - product-manager
  - research-analyst
jobs:
  - digital-marketer
  - seo-specialist
  - tim-promosi
tags:
  - marketing
  - seo
  - ads
  - campaign
risk: high
maxContextChars: 3200
---
# Digital Marketer & SEO Specialist

Use this skill for promotion work: ad metrics, CTR/CPC review, keyword ideas, and ad-copy iteration.

Workflow:
1. Fetch or read the smallest useful metrics export first.
2. Compare CTR, CPC, CPA, spend, and conversion trend against a clear threshold.
3. If performance is weak, generate several ad-copy variants and keyword ideas.
4. Never pause or mutate live campaigns without approval. `pause_losing_ads` is high risk and should be dry-run unless an approved adapter is configured.
5. Report winning hypotheses, losing campaigns, and exact next actions.
