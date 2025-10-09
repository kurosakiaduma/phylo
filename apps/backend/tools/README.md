# Tools and local email testing

## Mailtrap API Testing

- Set Mailtrap API credentials in `apps/backend/.env` (see `.env.example`): `MAILTRAP_API_TOKEN`, `MAILTRAP_SENDER_EMAIL`, `MAILTRAP_INBOX_ID`.
- Start the backend and exercise flows that send email (OTP request, invite creation). Mailtrap will capture outgoing messages so you can view them in the Mailtrap UI.

Example `.env` snippet for Mailtrap:

```
MAILTRAP_API_TOKEN=your-mailtrap-api-token
MAILTRAP_SENDER_EMAIL=no-reply@example.com
MAILTRAP_INBOX_ID=your-mailtrap-inbox-id
```

## Security

- Never commit `.env` with secrets.
- Use a vault (AWS Secrets Manager, HashiCorp Vault) in production.
- Sensitive dev-only endpoints (if present) are protected by `MGMT_API_KEY`. Set this in your `.env` and provide it via `X-MGMT-API-KEY` or `Authorization: Bearer <key>` if needed.
