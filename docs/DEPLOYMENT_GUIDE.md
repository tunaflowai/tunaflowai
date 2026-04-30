# Panduan Deployment TunaFlowAI

Panduan ini ditulis untuk menjalankan TunaFlowAI di server produksi kecil sampai menengah.

## Prasyarat

- Node.js 22 atau lebih baru.
- User Linux non-root, misalnya `tunaflow`.
- Reverse proxy HTTPS seperti Nginx/Caddy.
- Secret disimpan di environment/server secret manager, bukan di Git.

## Struktur direktori

```text
/opt/tunaflow/app       # source aplikasi
/opt/tunaflow/config    # config produksi
/var/lib/tunaflow       # data .tunaflow, audit, state
/var/log/tunaflow       # log service
```

## Config produksi minimum

```json
{
  "runtime": {
    "workspace": "/var/lib/tunaflow",
    "dataDir": ".tunaflow"
  },
  "server": {
    "host": "127.0.0.1",
    "port": 8787,
    "apiTokenEnv": "TUNAFLOW_API_TOKEN"
  },
  "auth": {
    "enabled": true,
    "passwordEnv": "TUNAFLOW_DASHBOARD_PASSWORD",
    "sessionSecretEnv": "TUNAFLOW_SESSION_SECRET"
  }
}
```

## Systemd contoh

```ini
[Unit]
Description=TunaFlowAI
After=network-online.target

[Service]
Type=simple
User=tunaflow
WorkingDirectory=/opt/tunaflow/app
Environment=TUNAFLOW_CONFIG=/opt/tunaflow/config/tunaflow.config.json
EnvironmentFile=/opt/tunaflow/config/tunaflow.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/tunaflow /var/log/tunaflow

[Install]
WantedBy=multi-user.target
```

## Reverse proxy

- Terminate TLS di proxy.
- Batasi upload body sesuai kebutuhan.
- Tambahkan basic rate limit untuk endpoint publik.
- Jangan expose dashboard tanpa auth.

## Backup dan audit

Backup harian minimal:
- config produksi;
- `.tunaflow/audit.jsonl`;
- `.tunaflow/state.json`;
- `.tunaflow/identity.json`;
- skill/plugin trust registry.

Verifikasi audit:

```bash
npm run check
node src/cli.js audit verify
```

## Rollback

1. Stop service.
2. Checkout tag/commit sebelumnya.
3. Restore config jika schema berubah.
4. Jalankan smoke test.
5. Start service lagi.

## Catatan keamanan

- Jangan jalankan sebagai root.
- Jangan aktifkan tool destruktif tanpa approval.
- Gunakan allowlist command.
- Semua integrasi pembayaran, broker, posting publik, dan upload cloud harus eksplisit dan approval-gated.
