# Security Best Practices

This document outlines how to handle credentials and sensitive information in the CV Bucket project.

## Local Development

### 1. Use Environment Files

All secrets (API keys, passwords, private keys) must be stored in `.env` (frontend) or `.env.server` (backend).

- **Do NOT** hardcode secrets in the source code.
- **Do NOT** commit `.env` or `.env.server` files to Git.

### 2. Frontend vs. Backend Secrets

**Important Distinction:**

- **Vite Frontend (`VITE_` prefix)**: Variables starting with `VITE_` (e.g., `VITE_FIREBASE_API_KEY`) **ARE** bundled into your JavaScript and can be seen by anyone via "Inspect Element". Only put **public** configuration here.
- **Server Backend (No prefix)**: Variables in `.env.server` (e.g., `R2_SECRET_KEY`, `FIREBASE_PRIVATE_KEY`) are **NEVER** sent to the browser. They remain securely on the server and cannot be accessed by users or "Inspect Element".

### 3. Environment Templates

If you add a new environment variable, update the corresponding `.env.example` or `.env.server.example` file with a placeholder value (e.g., `YOUR_API_KEY`). This helps other developers know what variables are needed without exposing your real keys.

### 3. Git Safety

The `.gitignore` file is configured to ignore all `.env*` files except for `.example` files.
Before pushing code, you can run the audit script to ensure no secrets are being tracked:

```bash
./scripts/check-env.sh
```

## Production Management

### Cloudflare Workers (Backend)

When deploying the API to Cloudflare Workers or similar platforms, do not use a `.env` file. Instead, use the platform's secret management:

- Use `wrangler secret put KEY_NAME` to upload secrets securely.
- These will be available in your Worker environment without being exposed in the code or dashboard.

### GitHub Actions (CI/CD)

If you use GitHub Actions for deployment:

- Store secrets in **Repository Settings > Secrets and variables > Actions**.
- Reference them in your workflow YAML using `${{ secrets.NAME }}`.

### Firebase Service Accounts

- For local development, pointing to a local JSON file via `FIREBASE_SERVICE_ACCOUNT_PATH` is easiest.
- For production, it is safer to use `FIREBASE_SERVICE_ACCOUNT_KEY` as a single-line JSON string stored in your environment's secrets manager.

## Reporting Vulnerabilities

If you discover a security vulnerability or an exposed credential, rotate the affected key immediately and notify the team.
