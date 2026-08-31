# ThreatPilot — Architecture Document

**Last Updated:** 2026-08-31  
**Status:** Approved (Phase 0 Assessment)

---

## 1. Architecture Overview

ThreatPilot uses a **Hybrid Architecture**: Docker containers (via WSL2) for the Wazuh SIEM stack, with native Windows components for endpoint telemetry and application services.

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
│  │  │  ThreatPilot   │  │     │  │  Wazuh Dashboard        │  │ │
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
ThreatPilot Backend (FastAPI)
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

### 4.3 ThreatPilot Application (Native Windows)

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
| ThreatPilot Backend | ~300 MB |
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
  8000  → ThreatPilot Backend (FastAPI)
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
D:\ThreatPilot\           → Project code & configuration
D:\ThreatPilot\datasets\  → Sample data, simulation artifacts
D:\DockerData\            → Docker Desktop data root (configured in Phase 1)
```

**C: drive** (12.7 GB free) is NOT used for project or Docker data.
