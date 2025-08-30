# Product Knowledge – Bitácora + Cumplimiento
**Goal:** Operational log + task compliance per Work Order (Subject) with evidence (photos/PDF), geotag, signature, timeline, and manager dashboard.

**Entities:** Tenant, User(role: owner|editor|viewer), Subject(OT/Project), Task, Evidence(kind: photo|pdf, checksum, lat/lon), LogEntry, ChecklistTemplate, ChecklistRun.

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