# Models

Router model mendukung fallback antar provider. Konfigurasi model memakai env var untuk API key dan chain untuk memilih model sesuai tugas.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
