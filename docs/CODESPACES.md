# Panduan GitHub Codespaces

Panduan ini untuk menjalankan TunaFlowAI langsung dari GitHub Codespaces.

## Cara cepat

1. Buka repo di GitHub.
2. Klik **Code → Codespaces → Create codespace on main**.
3. Tunggu `postCreateCommand` selesai menjalankan `npm install` dan `npm test`.
4. Jalankan:

```bash
npm start
```

5. Buka tab **Ports** di Codespaces.
6. Pada port `8787` dengan label **TunaFlowAI Dashboard**, klik **Open in Browser**.
7. Jika perlu akses dari luar tab Codespaces, ubah visibility port menjadi **Public** hanya jika memang aman.

## Kenapa host harus `0.0.0.0`?

Di laptop lokal, `127.0.0.1` aman. Di Codespaces, server perlu bind ke `0.0.0.0` agar GitHub bisa melakukan port forwarding. TunaFlowAI sekarang otomatis memakai `0.0.0.0` saat env `CODESPACES=true` terdeteksi. Di luar Codespaces, default tetap `127.0.0.1`.

## URL dashboard

Saat berjalan di Codespaces, CLI akan menampilkan dua URL:

- URL lokal container: `http://127.0.0.1:8787/dashboard`
- URL forwarding Codespaces: `https://<codespace>-8787.<domain>/dashboard`

Gunakan URL forwarding dari tab **Ports** bila membuka dari browser biasa.

## Troubleshooting

### Dashboard tidak terbuka

Cek:

```bash
npm start
```

Pastikan log menampilkan `Gateway TunaFlowAI berjalan` dan port `8787` muncul di tab **Ports**.

### Port belum muncul

Jalankan manual:

```bash
curl -I http://127.0.0.1:8787/dashboard
```

Jika `npm start` belum jalan, port tidak akan aktif.

### Model API error

Repo default memakai placeholder seperti `YOUR_OPENAI_MODEL`. Untuk uji GUI, dashboard tetap bisa dibuka tanpa API key. Untuk model nyata, isi secret di Codespaces Secrets atau environment variable, jangan commit ke repo.

### Dependency opsional

Fitur produksi tertentu membutuhkan paket opsional:

```bash
npm install playwright xlsx pdf-parse ws
npx playwright install chromium
```

Paket ini tidak dipasang otomatis agar fresh Codespaces ringan dan tidak gagal karena dependency browser besar.
