# Panduan Kematangan Produksi TunaFlowAI

Dokumen ini merangkum perbaikan yang membuat TunaFlowAI lebih siap dipakai sebagai produk nyata, bukan sekadar demo lokal. Prinsip utamanya: semua integrasi berisiko harus eksplisit, dapat diaudit, dan aman secara bawaan.

## 1. Driver browser Playwright penuh

TunaFlowAI sekarang menyiapkan `PlaywrightBrowserDriver` di `src/browser/playwright-driver.js` sebagai driver opsional untuk otomasi browser produksi.

Kemampuan yang disiapkan:
- membuka halaman dengan Chromium/Firefox/WebKit melalui Playwright;
- mengambil judul dan teks halaman;
- aksi dasar seperti `click`, `fill`, `type`, `press`, dan screenshot;
- dukungan `storageState` untuk sesi login terkontrol;
- audit event untuk akses dan aksi browser.

Aktivasi yang disarankan:

```bash
npm install playwright
npx playwright install chromium
```

Gunakan hanya di mesin tepercaya. Aksi klik, ketik, submit form, dan transaksi tetap harus melewati approval policy.

## 2. Parser XLSX/PDF production-grade

`src/parsers/document-parser.js` menambahkan `ProductionDocumentParser` sebagai lapisan parser dokumen produksi.

Format:
- `.txt`, `.md`, `.csv`, `.json`, `.log` tanpa dependency tambahan;
- `.xlsx`/`.xls` via paket opsional `xlsx`;
- `.pdf` via paket opsional `pdf-parse`.

Instalasi opsional:

```bash
npm install xlsx pdf-parse
```

Catatan keamanan: parser membaca file lokal. Untuk dokumen tidak tepercaya, jalankan di sandbox/container dan batasi ukuran file.

## 3. Discord Gateway WebSocket mode

Mode webhook/interactions tetap menjadi bawaan paling sederhana. Untuk bot real-time, gunakan Discord Gateway WebSocket pada adapter terpisah/opsional dengan prinsip berikut:

- token bot hanya dari env `DISCORD_BOT_TOKEN`;
- intents dibatasi sesuai kebutuhan;
- heartbeat dan reconnect exponential backoff;
- dedupe event berdasarkan sequence/id;
- semua pesan masuk dinormalisasi ke event `channel.message`;
- pengiriman pesan tetap lewat REST API Discord.

Status saat ini: desain dan guardrail siap di dokumentasi. Implementasi runtime penuh sebaiknya memakai dependency `ws` atau library resmi yang diaudit.

## 4. Slack Socket Mode

Socket Mode cocok saat server tidak ingin expose webhook publik.

Checklist produksi:
- env `SLACK_APP_TOKEN` untuk koneksi Socket Mode;
- env `SLACK_BOT_TOKEN` untuk `chat.postMessage`;
- reconnect dengan jitter;
- ack event cepat sebelum proses model panjang;
- event masuk tetap dinormalisasi ke `channel.message`.

Status saat ini: adapter webhook Slack tetap ada; Socket Mode dicatat sebagai adapter opsional agar dependency tidak membengkak.

## 5. Panduan produksi WhatsApp Cloud

Untuk WhatsApp Cloud production:
- gunakan `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, dan `WHATSAPP_APP_SECRET`;
- aktifkan verifikasi `x-hub-signature-256`;
- pisahkan nomor dev dan nomor produksi;
- jangan kirim pesan template tanpa approval bisnis;
- simpan audit outbound tanpa menyimpan isi rahasia berlebihan;
- hormati rate limit dan window 24 jam WhatsApp.

## 6. Multi-user dashboard roles

Arah role dashboard:
- `owner`: akses penuh, termasuk config dan approval berisiko tinggi;
- `admin`: kelola channel, model, skill, dan approval medium;
- `operator`: menjalankan task harian dan melihat status;
- `viewer`: hanya membaca dashboard/audit ringkas.

Implementasi bertahap:
1. tambah user store lokal berbasis hash password;
2. tambah cookie/session dengan role;
3. beri middleware authorization per endpoint;
4. audit semua login dan perubahan role;
5. dukung SSO/OIDC sebagai opsi enterprise.

## 7. Remote audit backend

`src/core/remote-audit-backend.js` menambahkan backend audit jarak jauh opsional. Audit lokal tetap utama, remote backend dipakai untuk mirror append-only.

Contoh config:

```json
{
  "audit": {
    "remote": {
      "enabled": true,
      "endpointEnv": "TUNAFLOW_AUDIT_ENDPOINT",
      "tokenEnv": "TUNAFLOW_AUDIT_TOKEN",
      "failClosed": false
    }
  }
}
```

Rekomendasi: gunakan endpoint internal HTTPS, batasi IP, dan simpan hash chain agar audit bisa diverifikasi.

## 8. Plugin marketplace index

`src/plugins/marketplace-index.js` menyiapkan pembaca index marketplace lokal/remote.

Format index:

```json
{
  "version": 1,
  "plugins": [
    {
      "name": "contoh-plugin",
      "description": "Plugin contoh",
      "version": "0.1.0",
      "url": "https://example.com/plugin.zip",
      "sha256": "...",
      "tags": ["utility"]
    }
  ]
}
```

Marketplace tidak boleh auto-install tanpa verifikasi signature dan approval user.

## 9. Signed plugin distribution

`src/plugins/signed-distribution.js` menyediakan utilitas manifest dan HMAC signature untuk distribusi plugin.

Alur aman:
1. buat manifest berisi daftar file dan hash;
2. tanda tangani manifest dengan secret signing key;
3. publish plugin + manifest;
4. saat install, verifikasi hash file dan signature;
5. catat trust record ke skill/plugin trust registry.

Untuk ekosistem publik, HMAC lokal bisa ditingkatkan ke Ed25519 public/private key.

## 10. Full deployment guide

Checklist deployment penuh:
- jalankan di user non-root;
- gunakan `.env` di server, jangan commit secret;
- aktifkan dashboard auth dan API token;
- gunakan reverse proxy HTTPS;
- aktifkan backup `.tunaflow/` dan audit log;
- pisahkan environment dev/staging/prod;
- pin dependency dan audit package;
- jalankan smoke test sebelum deploy;
- monitor health endpoint, disk, memory, dan queue;
- dokumentasikan prosedur rollback.

Contoh start production sederhana:

```bash
npm ci --omit=dev
export TUNAFLOW_CONFIG=/opt/tunaflow/config/tunaflow.config.json
export TUNAFLOW_HOST=127.0.0.1
export TUNAFLOW_PORT=8787
npm start
```

Untuk systemd, reverse proxy, backup, dan hardening detail, lihat `docs/DEPLOYMENT_GUIDE.md`.
