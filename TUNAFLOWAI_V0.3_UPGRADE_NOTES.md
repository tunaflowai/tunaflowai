# Catatan Upgrade v0.3

Rilis ini memperkuat maturity awal produk: policy, sandbox, skill, dan alur approval.

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
