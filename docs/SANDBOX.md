# Sandbox

Sandbox membatasi command dan side effect. Gunakan allowlist, timeout, output limit, dan approval untuk command berisiko.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
