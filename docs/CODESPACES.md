# GitHub Codespaces Guide

Use this guide to run TunaFlowAI directly inside GitHub Codespaces.

## Quick start

1. Open the repository on GitHub.
2. Click **Code → Codespaces → Create codespace on main**.
3. Wait for `postCreateCommand` to finish `npm install` and `npm test`.
4. Start the gateway:

```bash
npm start
```

5. Open the **Ports** tab in Codespaces.
6. Find port `8787` labeled **TunaFlowAI Dashboard** and click **Open in Browser**.
7. Only make the port public when you intentionally want external access.

## Why `0.0.0.0` is required

On a local laptop, `127.0.0.1` is the safest default. In Codespaces, the server must bind to `0.0.0.0` so GitHub can forward the port. TunaFlowAI automatically uses `0.0.0.0` when `CODESPACES=true` is detected. Outside Codespaces, the default remains `127.0.0.1`.

## Dashboard URL

When running in Codespaces, the CLI prints two URLs:

- Container-local URL: `http://127.0.0.1:8787/dashboard`
- Codespaces forwarded URL: `https://<codespace>-8787.<domain>/dashboard`

Use the forwarded URL from the **Ports** tab when opening the dashboard from a normal browser.

## Troubleshooting

### Dashboard does not open

Check the server:

```bash
npm start
```

The log should show `TunaFlowAI gateway running` and port `8787` should appear in the **Ports** tab.

### Port does not appear

Run:

```bash
curl -I http://127.0.0.1:8787/dashboard
```

If `npm start` is not running, the port will not be active.

### Model API errors

The default repository uses placeholders such as `YOUR_OPENAI_MODEL`. The dashboard can be tested without API keys. For real model calls, put credentials in Codespaces Secrets or environment variables. Do not commit secrets.

### Optional dependencies

Some production features need optional packages:

```bash
npm install playwright xlsx pdf-parse ws
npx playwright install chromium
```

These packages are not installed automatically so a fresh Codespaces setup remains lightweight and avoids large browser dependency failures.
