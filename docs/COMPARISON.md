# Comparison

TunaFlowAI berbeda dari chatbot biasa karena memiliki state, skill, approval policy, audit hash chain, channel adapter, dan tool registry. Fokusnya adalah operasi kerja lokal yang dapat dikendalikan.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
