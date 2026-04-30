# Panduan TunaFlowAI

TunaFlowAI adalah agen operasi kerja lokal yang membantu menerima event, memilih model, memakai skill, menjalankan tool dengan approval, dan menyimpan audit log. Produk ini dibuat lokal-first: aman secara bawaan, hemat token, dan mudah dikembangkan.

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
