# Extended job skills

This upgrade adds role-based bundled skills as `SKILL.md` files, matching the current TunaFlowAI skill loader.

## Added roles

- Digital Marketer and SEO Specialist
- Talent Acquisition Specialist
- Data Analyst and Reporting Assistant
- Virtual Secretary and Personal Assistant
- Project Manager and Scrum Master
- Translator and Copywriter
- E-commerce and Marketplace Manager
- Legal Assistant and Paralegal
- IT Helpdesk and QA Tester
- Web Researcher and Research Assistant, merged into `browser-researcher`
- Cybersecurity Analyst Tier 1
- Smart Hardware and IoT Controller
- Audio and Media Processor
- Supply Chain and Logistics Coordinator
- Database Sync Engineer
- Web Scraper and Sentiment Analyst
- Algorithmic Trader and Quant System
- Music A&R and Playlist Pitcher
- Franchise and Multi-Branch Supervisor
- Smart Home Butler
- Meta-Agent COO

## Deduplication decisions

- `browser-researcher` is kept as the best home for Web Researcher / Research Assistant workflows instead of adding a duplicate `research-assistant` skill.
- `financial-market-analyst` remains useful for market summaries. `algorithmic-trader` is separate because broker order preparation is critical risk.
- `fnb-manager` remains useful for single-store restaurant operations. `ecommerce-marketplace-manager`, `supply-chain-logistics-coordinator`, and `franchise-branch-supervisor` handle online store, supply chain, and multi-branch workflows.
- `music-content-manager` remains useful for content planning. `music-ar-playlist-pitcher` focuses on release availability, playlist pitching, and artist profile claim workflows.
- `devops-server-guard` remains useful for server health. `cybersecurity-tier1-analyst` focuses on suspicious IP triage, firewall-block approvals, and urgent escalation.
- `system-operator` remains useful for local commands. `meta-agent-coo` focuses on task delegation and worker spawning.

## Approval levels

Low-risk tools only read, summarize, or draft. Medium-risk tools write local files or send routine outbound messages. High-risk tools affect accounts, inventory, schedules, hardware, uploads, or purchases. Critical tools involve firewall changes or broker orders.

Every high or critical tool should be routed through TunaFlowAI's approval engine before live execution.
