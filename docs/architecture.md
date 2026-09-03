# IncidentForge — Architecture Document

**Last Updated:** 2026-09-03
**Status:** Approved (Phase 5 Backend Foundation complete)

---

## 1. Architecture Overview

IncidentForge uses a **Hybrid Architecture**: Docker containers (via WSL2) for the Wazuh SIEM stack, with native Windows components for endpoint telemetry and application services.

### Why Hybrid?

| Concern | Decision |
|---|---|
| Wazuh is Linux-native | Runs in Docker (WSL2 backend) |
| Windows telemetry must be real | Sysmon + Wazuh Agent run natively on Windows |
| RAM is limited (16 GB) | Docker containers are lighter than full VMs |
| Development speed | Docker Compose enables single-command stack management |
| Portfolio presentation | `docker compose up` demonstrates infrastructure-as-code |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        WINDOWS HOST (16 GB RAM)                 │
│                                                                 │
│  ┌──────────────────────┐     ┌───────────────────────────────┐ │
│  │   NATIVE WINDOWS     │     │   DOCKER (WSL2 Backend)       │ │
│  │                      │     │                               │ │
│  │  ┌────────────────┐  │     │  ┌─────────────────────────┐  │ │
│  │  │  Sysmon        │──┼──┐  │  │  Wazuh Manager          │  │ │
│  │  │  (Event Gen)   │  │  │  │  │  (1 GB RAM limit)       │  │ │
│  │  └────────────────┘  │  │  │  └────────────┬────────────┘  │ │
│  │                      │  │  │               │               │ │
│  │  ┌────────────────┐  │  │  │  ┌────────────▼────────────┐  │ │
│  │  │  Wazuh Agent   │──┼──┘  │  │  Wazuh Indexer          │  │ │
│  │  │  (< 200 MB)    │  │     │  │  (1.5 GB RAM limit)     │  │ │
│  │  └────────────────┘  │     │  └────────────┬────────────┘  │ │
│  │                      │     │               │               │ │
│  │  ┌────────────────┐  │     │  ┌────────────▼────────────┐  │ │
│  │  │ IncidentForge  │  │     │  │  Wazuh Dashboard        │  │ │
│  │  │  Backend       │◄─┼─────┤  │  (512 MB RAM limit)     │  │ │
│  │  │  (FastAPI)     │  │     │  └─────────────────────────┘  │ │
│  │  └───────┬────────┘  │     │                               │ │
│  │          │           │     │  Bound to 127.0.0.1 ONLY      │ │
│  │  ┌───────▼────────┐  │     └───────────────────────────────┘ │
│  │  │  SOC Dashboard │  │                                       │
│  │  │  (Vite+React)  │  │                                       │
│  │  └───────┬────────┘  │                                       │
│  │          │           │                                       │
│  │  ┌───────▼────────┐  │                                       │
│  │  │  ML Risk       │  │                                       │
│  │  │  Scoring       │  │                                       │
│  │  │  (sklearn/XGB) │  │                                       │
│  │  └───────┬────────┘  │                                       │
│  │          │           │                                       │
│  │  ┌───────▼────────┐  │                                       │
│  │  │  AI Investigator│  │                                       │
│  │  │  (API-based)   │──┼──────► External LLM API               │
│  │  └───────┬────────┘  │       (OpenAI / Gemini)               │
│  │          │           │                                       │
│  │  ┌───────▼────────┐  │                                       │
│  │  │  Response      │  │                                       │
│  │  │  Engine        │  │                                       │
│  │  └────────────────┘  │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

```
Sysmon (Windows Events)
    │
    ▼
Wazuh Agent (collects & forwards)
    │
    ▼  Port 1514 (TCP)
Wazuh Manager (decodes, analyzes, generates alerts)
    │
    ▼  Internal
Wazuh Indexer (stores alerts, searchable index)
    │
    ▼  Port 9200 (REST API)
IncidentForge Backend (FastAPI)
    │
    ├──► Alert Normalizer
    │       │
    │       ▼
    ├──► Threat Intel Enricher (IOC lookup)
    │       │
    │       ▼
    ├──► Incident Correlator (group related alerts)
    │       │
    │       ▼
    ├──► ML Risk Scorer (prioritize by risk)
    │       │
    │       ▼
    ├──► AI Investigator (explain & recommend)
    │       │
    │       ▼
    ├──► Response Engine (execute approved actions)
    │       │
    │       ▼
    └──► Audit Logger (record everything)
            │
            ▼
        SOC Dashboard (React — real-time view)
```

---

## 4. Component Details

### 4.1 Endpoint Telemetry (Native Windows)

| Component | Purpose | Resource Impact |
|---|---|---|
| **Sysmon** | Generates detailed Windows event telemetry (process creation, network connections, file changes, registry modifications) | < 100 MB RAM, negligible CPU |
| **Wazuh Agent** | Collects Sysmon logs + Windows Security events, forwards to Wazuh Manager | < 200 MB RAM |

### 4.2 Wazuh SIEM Stack (Docker)

| Container | Purpose | RAM Limit | Port |
|---|---|---|---|
| **Wazuh Manager** | Receives agent data, applies detection rules, generates alerts | 1 GB | 1514, 1515, 55000 |
| **Wazuh Indexer** | Stores and indexes alerts (OpenSearch-based) | 1.5 GB | 9200 |
| **Wazuh Dashboard** | Web UI for Wazuh (OpenSearch Dashboards) | 512 MB | 443 |

### 4.3 IncidentForge Application (Native Windows)

| Component | Technology | Purpose |
|---|---|---|
| **Backend API** | Python / FastAPI | Central orchestrator — normalizes, correlates, scores, investigates |
| **ML Risk Scoring** | scikit-learn, XGBoost | Lightweight CPU-based alert risk scoring |
| **AI Investigator** | External API (OpenAI/Gemini) | LLM-powered incident analysis and explanation |
| **Response Engine** | Python | Playbook-driven automated/approved response |
| **SOC Dashboard** | Vite + React | Real-time security operations interface |

---

## 5. RAM Budget

| Component | Allocation |
|---|---|
| Windows OS + background | ~4 GB |
| Wazuh Manager (Docker) | 1 GB (capped) |
| Wazuh Indexer (Docker) | 1.5 GB (capped) |
| Wazuh Dashboard (Docker) | 512 MB (capped) |
| Docker/WSL2 overhead | ~500 MB |
| IncidentForge Backend | ~300 MB |
| ML Component | ~500 MB |
| SOC Dashboard (dev server) | ~200 MB |
| IDE + development tools | ~1.5 GB |
| **Total** | **~10 GB** |
| **Remaining buffer** | **~6 GB** |

> **Strategy:** Non-essential components (ML training, AI investigation) run on-demand only. Wazuh containers have hard memory limits.

---

## 6. Network Architecture

```
All services bound to 127.0.0.1 (localhost only)

Port Map:
  1514  → Wazuh Manager  (agent communication)
  1515  → Wazuh Manager  (agent enrollment)
  514   → Wazuh Manager  (syslog)
  443   → Wazuh Dashboard (HTTPS web UI)
  9200  → Wazuh Indexer  (REST API)
  55000 → Wazuh API      (management)
    8000  → IncidentForge Backend (FastAPI)
  5173  → SOC Dashboard  (Vite dev server)
```

**No services are exposed to external networks.**

---

## 7. Security Boundaries

1. **Docker network isolation** — Wazuh containers communicate on an internal Docker bridge network
2. **Localhost binding** — All ports bound to `127.0.0.1`, not `0.0.0.0`
3. **Analyst approval gates** — Automated response requires human confirmation for destructive actions
4. **No real malware** — All simulations use benign Atomic Red Team–style artifacts
5. **Secrets management** — `.env` files excluded from Git; `.env.example` contains only placeholders
6. **Audit trail** — All actions logged for accountability

---

## 8. Storage Layout

All project data resides on **D: drive** (195 GB free):

```
D:\IncidentForge\          → Project code & configuration
D:\IncidentForge\datasets\ → Sample data, simulation artifacts
D:\DockerData\            → Docker Desktop data root (configured in Phase 1)
```

**C: drive** (12.7 GB free) is NOT used for project or Docker data.

## 9. Wazuh Ingestion Compatibility Note

Phase 2F is complete with a known ingestion compatibility limitation. The Wazuh Manager and its embedded Filebeat use Filebeat 7.10.2, which produces legacy `_type` metadata in Elasticsearch bulk requests. OpenSearch 2.13 rejects this metadata, so continuous indexing of new Wazuh alerts is currently blocked.

The Wazuh Manager, Indexer, Dashboard, Manager API, TLS, and persistent storage infrastructure is operational. The existing Wazuh alert index and its 195 alert documents are preserved. Wazuh 4.9.2 was inspected and retains Filebeat 7.10.2, so it does not resolve this issue. The official `compatibility.override_main_response_version` response override was tested and rejected because it breaks Dashboard compatibility. No unsupported workaround was implemented; this remains a documented infrastructure limitation rather than a silently masked failure.

The Phase 5 backend should keep telemetry ingestion behind an adapter boundary so IncidentForge is not tightly coupled to the currently blocked Filebeat-to-OpenSearch path.

## 10. Phase 5 Backend Foundation

The initial IncidentForge backend foundation is implemented in Python with FastAPI, Pydantic, and Uvicorn. Telemetry enters through a source-agnostic adapter contract and is converted by a deterministic normalization service into the canonical event model.

Canonical models now define normalized events, alerts, incidents, investigation results, response actions, and audit events.

### 10.1 Implemented Components

The following components of the Phase 5 backend foundation are now implemented:

| Component | Status | Responsibility |
|---|---|---|
| Ingestion adapter boundary | Implemented | Source-agnostic adapter contract (current: `FixtureAdapter` for deterministic development/testing). Real Wazuh ingestion is not implemented. |
| Event normalization | Implemented | Deterministic conversion of raw telemetry into the canonical `NormalizedEvent` model via `NormalizationService`. |
| Event processing service | Implemented | Orchestrates persistence and audit for each accepted event via `EventProcessingService`. |
| Repository / persistence layer | Implemented | `EventRepository` owns all database persistence operations against the SQLite-backed SQLModel store. |
| SQLite persistence | Implemented | Local SQLite database is the current development persistence layer. |

### 10.2 Current Event Flow

The currently implemented event intake flow is:

```
Request
    │
    ▼
Pydantic validation  (NormalizedEvent)
    │
    ▼
NormalizationService
    │
    ▼
EventProcessingService
    │
    ▼
EventRepository
    │
    ▼
SQLite persistence  (Event / AuditEvent rows)
    │
    ▼
AuditEvent  (recorded for "created" and "duplicate" outcomes)
    │
    ▼
EventProcessingResult
    │
    ▼
HTTP response
```

Key properties of the current implementation:

- **Event intake is persistent.** Accepted events are stored in the SQLite-backed `Event` table.
- **SQLite is the current development persistence layer.** It is not a production store; production-grade persistence (e.g. PostgreSQL / cloud-managed) is a future migration.
- **`EventRepository` owns database persistence operations.** The processing service never speaks to the session directly.
- **`EventProcessingService` owns event-processing orchestration.** It calls the repository for both event persistence and audit-event creation.
- **Duplicate event IDs are handled deterministically.** A re-submitted `event_id` is matched against the existing row by `EventRepository`.
- **Duplicates do not create another `Event` row.** The repository returns the existing row and a `created=False` flag.
- **Duplicates do not overwrite the original event.** The existing row is preserved unchanged.
- **Audit records are generated for meaningful processing outcomes.** An `AuditEvent` is written for both the `event.created` and `event.duplicate` actions.
- **Persistence is already implemented.** It is not deferred.

### 10.3 Architectural Boundaries

The current backend preserves these architectural boundaries, and future layers plug in behind them without changing earlier layers:

1. **Ingestion adapter boundary** — `FixtureAdapter` is the current deterministic development/test adapter. Real Wazuh ingestion is not implemented.
2. **Event normalization** — `NormalizationService` produces the canonical `NormalizedEvent`.
3. **Event processing service** — `EventProcessingService` orchestrates persistence and audit.
4. **Repository / persistence layer** — `EventRepository` encapsulates SQLite access for events and audit events.
5. **Detection / correlation** — Future layer.
6. **Threat-intelligence enrichment** — Future layer.
7. **AI investigation** — Future layer.
8. **Controlled response engine** — Future layer; response actions remain data-only at this stage and no commands or automated actions are executed.

### 10.4 Wazuh Compatibility Constraint (Reminder)

The Wazuh → Filebeat → OpenSearch `_type` metadata limitation documented in Section 9 remains a known infrastructure limitation. The adapter boundary intentionally isolates the backend from that path so the Filebeat-to-OpenSearch ingestion block does not block development. The current `FixtureAdapter` is the deterministic development/test ingestion adapter; real Wazuh ingestion is not implemented in this phase.

### 10.5 Future Persistence Evolution

SQLite is used as the current development persistence layer. A future migration to a production-grade store (for example PostgreSQL or a managed cloud database) is part of the planned evolution of the persistence layer, not part of "future database persistence," which is already implemented.