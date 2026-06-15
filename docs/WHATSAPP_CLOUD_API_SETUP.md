# WhatsApp Cloud API Setup

ClientPulse defaults to `WHATSAPP_MODE=mock`. The inbox, lead capture, message history, and
reply workflow work locally without a Meta account.

## Meta Cloud API configuration

1. Create a Meta developer app and add the WhatsApp product.
2. Add a phone number and note its **Phone Number ID**.
3. Create a long-lived system-user access token with WhatsApp permissions.
4. Set a private webhook verification token.
5. Configure:

```env
WHATSAPP_MODE=real
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_API_VERSION=v22.0
BACKEND_PUBLIC_URL=https://api.your-domain.com
```

6. In Meta, set callback URL to:

```text
https://api.your-domain.com/api/whatsapp/webhook
```

7. Subscribe to the `messages` webhook field.

## Endpoints

- `GET /api/whatsapp/webhook`: Meta verification challenge.
- `POST /api/whatsapp/webhook`: incoming message receiver.
- `POST /api/whatsapp/send`: authenticated text send.
- `POST /api/whatsapp/mock-message`: local demo receiver.
- `GET /api/whatsapp/template-example`: example template payload.

## Production hardening

Before onboarding sensitive use cases, validate Meta webhook signatures, encrypt sensitive
fields, use per-workspace credentials, implement opt-in/opt-out tracking, honor the
24-hour conversation window, use approved templates, and add retry/idempotency handling.
