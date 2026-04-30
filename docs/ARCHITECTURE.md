# Architecture

Arsitektur TunaFlowAI terdiri dari event store, runtime agen, router model, registry tool, policy engine, skill loader, channel adapter, dashboard, dan audit log. Setiap event dikompresi menjadi konteks ringkas, diproses model, lalu aksi dievaluasi policy sebelum dieksekusi.

## Praktik aman

- Simpan credential di environment variable atau secret manager.
- Jalankan test sebelum deploy.
- Aktifkan approval untuk aksi medium, high, dan critical.
- Catat perubahan penting di audit log.
- Jangan menerbitkan file lokal atau data pengguna tanpa izin eksplisit.
