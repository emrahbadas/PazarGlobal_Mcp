# PazarGlobal MCP Server

Small MCP (Model Context Protocol) server exposing two tools used by PazarGlobal:

- `clean_price` — Clean and parse messy price strings into a numeric `clean_price`.
- `insert_listing` — Insert a product listing into Supabase via REST API (requires SUPABASE_URL and SUPABASE_SERVICE_KEY in `.env`).

Setup

1. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
2. Install dependencies:

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

Access

- MCP endpoint: `http://127.0.0.1:7777/mcp` (GET returns tools list for Agent Builder compatibility)

Security

- Do NOT commit `.env` — it contains sensitive keys. This repository excludes `.env` via `.gitignore`.
