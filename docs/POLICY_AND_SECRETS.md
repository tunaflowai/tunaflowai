# Policy And Secrets

Policy menentukan apakah tool boleh langsung jalan, butuh approval, atau ditolak. Secret harus disimpan di env/vault dan direduksi dari audit.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
