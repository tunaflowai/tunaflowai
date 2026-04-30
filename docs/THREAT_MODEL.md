# Threat Model

Threat model mencakup prompt injection, secret leakage, command berbahaya, webhook palsu, plugin tidak tepercaya, dan supply-chain attack.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
