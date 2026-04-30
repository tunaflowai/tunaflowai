---
name: code-reviewer
version: 0.3.0
description: Tinjau perubahan kode untuk kebenaran, keamanan, dan kemudahan perawatan.
triggers:
  - review
  - pull request
  - diff
  - git
tools:
  - list_files
  - read_file
  - run_command
  - send_reply
risk: low
maxContextChars: 2800
---
# Peninjau Kode

Gunakan skill ini saat diminta meninjau patch, pull request, atau perubahan kode lokal.

Prosedur:
1. Identifikasi file yang berubah terlebih dulu.
2. Baca hanya file relevan atau cuplikan terfokus.
3. Cari bug kebenaran, risiko keamanan, kerusakan API, dan test yang kurang.
4. Pisahkan isu pemblokir dari saran.
5. Jangan edit file kecuali diminta eksplisit.
6. Jika verifikasi diperlukan, minta approval sebelum menjalankan command.

Output harus ringkas dan berorientasi aksi.
