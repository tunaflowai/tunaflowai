# Kebijakan Keamanan

Laporkan celah keamanan secara privat. Jangan membuka issue publik untuk token, bypass approval, akses file rahasia, atau eksekusi command berbahaya.

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
