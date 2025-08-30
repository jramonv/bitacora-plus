# Product Knowledge – Bitácora + Cumplimiento
**Goal:** Operational log + task compliance per Work Order (Subject) with evidence (photos/PDF), geotag, signature, timeline, and manager dashboard.

**Entities:** Tenant, User(role: owner|editor|viewer), Subject(OT/Project), Task, Evidence(kind: photo|pdf, checksum, lat/lon), LogEntry, ChecklistTemplate, ChecklistRun.

**Subject types:** project | research | maintenance | health | education | personal.

**Business rules (blocking close):**
- min_photos (>=3), geotag_required(true), signature_required(true), checklist_id(optional).
- On close: status='closed', closed_at=now(), log event 'status_change'.

**Security:** Multi-tenant via tenant_id (RLS on all tables). Storage path: bitacora/tenant/{subject}/{task}/.

**KPIs:** on-time %, compliance-ok %, SLAs (due today / at risk / overdue), rework.

**Roadmap (less→more):**
W1 CRUD + close-guards + dashboard + PDF export
W2 email alerts (Resend) + scoring by tech/client
W3 OCR light + photo dedupe by checksum
W4 Public report links + REST API

## AI & Privacy
- AI jobs (no-chat): normalize_logs, ocr_extract, risk_score, compliance_summary, embed_object.
- Structured Outputs JSON (contractos validados); guardar en `ai_outputs`.
- Flags de cumplimiento: ["missing_geotag","insufficient_photos","duplicate_photo","missing_signature","checklist_incomplete"].
- PII: `redact_pii: true` por defecto antes de enviar a IA; `allow_image_processing` configurable por tenant.
- Cost cap diario por tenant (USD) y logging de tokens/costo por job.

## API & Automations (foundation)
- Exponer REST `/api/v1` (multi-tenant) con API keys por tenant + Idempotency-Key.
- Webhooks firmados (HMAC) con **outbox** y reintentos.
- Automatizaciones: triggers por evento (task.closed, evidence.added, ai.summary.created) y por horario.