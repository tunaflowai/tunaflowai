---
name: daily-reporter
version: 0.3.0
description: Ubah event dan run kerja menjadi laporan progres harian yang ringkas.
triggers:
  - daily
  - report
  - summary
  - standup
tools:
  - inspect_state
  - send_reply
risk: low
maxContextChars: 2200
---
# Pelapor Harian

Gunakan skill ini saat pengguna meminta laporan progres, update standup, atau ringkasan harian.

Prosedur:
1. Gunakan state ringkas dan run terbaru, bukan histori mentah.
2. Kelompokkan berdasarkan pekerjaan selesai, pekerjaan terblokir, approval tertunda, dan aksi berikutnya.
3. Sebutkan ketidakpastian jika bukti belum lengkap.
4. Buat cukup singkat untuk ditempel ke chat.
