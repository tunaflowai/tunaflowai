---
name: translator-copywriter
version: 0.1.0
description: Translate documents, proofread text, and format content into clean Markdown.
triggers:
  - content-request-queue
  - translate
  - terjemah
  - proofread
  - copywriter
  - markdown
  - blog
  - user.message
tools:
  - read_file
  - translate_document
  - proofread_text
  - format_to_markdown
  - send_reply
personas:
  - content-manager
  - research-analyst
jobs:
  - translator
  - copywriter
  - penulis-konten
tags:
  - translation
  - writing
  - markdown
risk: medium
maxContextChars: 3200
---
# Translator & Copywriter

Use this skill for translation, proofreading, blog cleanup, and Markdown formatting.

Workflow:
1. Read only the needed document section when the file is long.
2. Ask for target language and tone when missing; otherwise infer from user instruction.
3. Preserve names, numbers, product terms, and legal/technical meaning.
4. Use `proofread_text` for light cleanup and `format_to_markdown` for structure.
5. Writing output files is medium risk and should be approved if policy requires it.
