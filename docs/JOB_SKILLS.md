# Job Skills Upgrade

This upgrade adds six bundled job skills and a lightweight job-tool pack.

## Added skills

1. `digital-marketer-seo`
   - Tools: `fetch_ad_metrics`, `analyze_keywords`, `generate_ad_copy`, `pause_losing_ads`.
   - `pause_losing_ads` is high risk and should stay approval gated.

2. `talent-acquisition`
   - Tools: `extract_resume_text`, `score_candidate`, `send_notification`, `send_interview_invite`, `send_rejection_email`.
   - DOCX and scanned PDF extraction intentionally return command guidance unless a reviewed parser/OCR adapter is added.

3. `data-analyst-reporter`
   - Tools: `clean_csv_data`, `find_data_anomalies`, `generate_chart_image`.
   - Charts are SVG by default to stay lightweight and dependency-free.

4. `virtual-secretary`
   - Tools: `check_calendar_conflict`, `schedule_meeting`, `book_ticket_api`.
   - Ticket booking is high risk and dry-run/local-record by default.

5. `project-manager-scrum`
   - Tools: `check_overdue_tasks`, `ping_team_member`, `generate_sprint_report`.

6. `translator-copywriter`
   - Tools: `translate_document`, `proofread_text`, `format_to_markdown`.

## Duplicate handling

- `data-analyst-reporter` does not replace `back-office-admin`. Back office remains for invoice/data-entry workflows; Data Analyst is for cleaning, anomaly detection, and charting.
- `translator-copywriter` does not replace `customer-support-drafter` or `music-content-manager`. It handles general translation/proofreading/Markdown; the existing skills stay specialized for customer replies and music/content metrics.
- `project-manager-scrum` complements `daily-reporter`; it focuses on overdue tasks, pings, and sprint reports.

## Lightweight design

The new tools avoid heavy dependencies. They use local files, CSV/JSON parsing, SVG charts, and outbox logs under `.tunaflow/outbound` when a real integration is not configured.
