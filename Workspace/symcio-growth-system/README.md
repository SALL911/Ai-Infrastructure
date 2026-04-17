# Symcio Growth System

Automated growth and revenue system for Symcio BrandOS™.

## Modules

- **Lead Capture** — validation, scoring, CRM upsert, notifications (see [docs/01-lead-capture.md](docs/01-lead-capture.md))
- **Brand AI Audit** — query AI engines for brand visibility (skeleton)
- **Data Collection / Scoring / Report** — supporting modules

## Quick Start

```bash
npm install
cp .env.example .env
# edit .env with your HubSpot token, SMTP credentials, webhook URLs
npm test
npm start
```

Server runs on http://localhost:3000.

Full documentation: [docs/README.md](docs/README.md)
