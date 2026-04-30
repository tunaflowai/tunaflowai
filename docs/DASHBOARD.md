# Dashboard

Dasbor menampilkan status runtime, model, skill, persona, approval, task, audit, dan channel. Akses produksi harus dilindungi password/API token dan role dashboard.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
