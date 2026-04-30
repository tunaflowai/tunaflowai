# Demo

Demo lokal menjalankan model mock dan webhook lokal agar fitur dapat diuji tanpa API berbayar. Gunakan demo untuk validasi smoke test sebelum mengaktifkan integrasi nyata.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
