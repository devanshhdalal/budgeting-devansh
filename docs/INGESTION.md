# Ingestion pipeline and external integrations

How AMEX/Neo/Scotiabank notifications, Excel, and Apple Shortcuts connect to Savvr.

---

## Overview

```
iPhone notification/email  →  Shortcut  →  POST /api/ingest  →  parser  →  upsertTransaction
Excel VBA (new rows only)  →  POST /api/transactions
Website                    →  POST /api/transactions
```

All paths converge on the same storage layer (`data/users/{userId}/transactions.json` + optional GitHub sync).

---

## POST /api/ingest

**Auth:** Per-source API key in `x-api-key` header (no `x-budget-user` needed).

| Env var | Source value |
|---------|----------------|
| `API_KEY_AMEX` | `amex` |
| `API_KEY_NEO` | `neo` |
| `API_KEY_SCOTIA` | `scotia_email` |
| `API_KEY_DEVANSH` | maps to user `devansh` (legacy Shortcut) |

**Body:**

```json
{
  "source": "amex",
  "raw_text": "Full notification or email body text"
}
```

Use `source: "test"` to create `IsTest: true` transactions (excluded from dashboard totals).

**Response:**

```json
{
  "success": true,
  "parsed": true,
  "transaction": { "id": "...", "Amount": 17.24, "Merchant": "...", ... }
}
```

If parsing fails, `parsed: false` and a **Needs review** transaction is still created with the redacted raw text in `Notes`.

---

## Apple Shortcuts setup

1. **AMEX:** Automation → Notification → AMEX Canada → Run Shortcut
2. **Neo:** Automation → Notification → Neo → Run Shortcut
3. **Scotia:** Automation → Email → From Scotiabank → Run Shortcut

Each Shortcut:

1. Get notification/email body as text
2. **Get Contents of URL** → POST `https://personalbudget.devanshdalal.com/api/ingest`
3. Headers: `Content-Type: application/json`, `x-api-key: <your key>`
4. Body (JSON): `{ "source": "amex", "raw_text": "<body>" }`

**On failure:** Create a Reminder with the raw text so nothing is lost.

**Tune parsers:** Send real purchases with `source: "test"` first, then adjust regex in `server/utils/parsers/*.js`.

---

## Card matching (last 4 digits)

In Settings, set **Last 4 digits** per card. Stored in config as:

```json
"CARD_IDENTIFIERS": {
  "1234": "AMEX Cobalt"
}
```

Parsers extract `cardLast4` from notification text and resolve the `Card` field automatically.

---

## Excel integration (local .xlsm, no cloud)

### Read (Power Query)

- Data → Get Data → From Web
- URL: `https://personalbudget.devanshdalal.com/api/transactions`
- Headers: `x-api-key`, `x-budget-user` (for web key mode)

### Write new rows only (VBA)

```vba
Sub SyncNewTransaction()
  Dim http As Object
  Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
  http.Open "POST", "https://personalbudget.devanshdalal.com/api/transactions", False
  http.SetRequestHeader "Content-Type", "application/json"
  http.SetRequestHeader "x-api-key", "YOUR_API_KEY"
  ' Optional if using shared web key:
  ' http.SetRequestHeader "x-budget-user", "devansh"
  http.Send "{""Amount"":17.24,""Date"":""2026-05-08"",""Merchant"":""Store"",""Category"":""Food"",""Card"":""AMEX Cobalt"",""Source"":""excel""}"
  MsgBox http.Status & " " & http.ResponseText
End Sub
```

**Edits to existing rows:** use the website, not Excel (avoids conflict resolution).

Store the API key only in your local macro - never share the `.xlsm`.

---

## Dedup

Ingest computes `DedupKey = hash(source + merchant + amount + date)`. Duplicate POSTs within 24 hours return the existing transaction instead of creating a second row.

---

## Security

- Separate API keys per source (revoke one without breaking others)
- Rate limit: 60 requests/minute per user on `/api/ingest`
- Raw text redacted before storage (full card numbers stripped)
- Set `DEBUG_INGEST=1` to log ingest attempts (not full raw text in production)

---

## Transaction schema (ingestion fields)

| Field | Purpose |
|-------|---------|
| `Source` | `amex`, `neo`, `scotia_email`, `manual`, `excel`, `test` |
| `IsTest` | Excluded from dashboard when true |
| `IsRefund` | True for credits; `Amount` is negative |
| `Currency` | Default `CAD` |
| `ForeignAmount` / `ForeignCurrency` | Optional dual-currency display |
| `DedupKey` | Idempotency hash |

PascalCase field names are intentional for Shortcut JSON compatibility.
