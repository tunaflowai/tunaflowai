# Hardening Report

Hardening utama: jangan jalankan root, aktifkan approval, verifikasi webhook, batasi command, gunakan secret env, backup audit, dan monitor service.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
