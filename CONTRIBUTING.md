# Panduan Kontribusi

Kontribusi diterima melalui perubahan kecil, jelas, dan mudah diuji. Jalankan test sebelum pull request, jangan commit secret, dan jelaskan alasan perubahan.

## Cara cepat

```bash
npm install
npm test
npm run check
npm run dev
```

## Prinsip produk

- Lokal-first dan aman secara bawaan.
- Tindakan berisiko wajib melewati approval.
- Secret tidak boleh masuk Git.
- Audit log harus bisa diverifikasi.
- Integrasi produksi sebaiknya diaktifkan bertahap.
