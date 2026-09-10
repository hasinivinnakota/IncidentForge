# 🛡️ INCIDENTFORGE

**AI-Assisted SOC Investigation & Incident Response Platform**

IncidentForge is a modern, defensive cybersecurity operations platform that automates the progression from raw endpoint telemetry collection to alert detection, multi-stage correlation, machine learning risk prioritization, threat intelligence enrichment, LLM-powered investigation, SOC case management, and analyst-controlled response simulation.

---

## 🎯 Problem Statement

Modern Security Operations Centers (SOCs) face alert fatigue, disconnected detection tools, fragmented investigative workflows, and risky automated response mechanisms.

IncidentForge demonstrates how to solve these challenges with an integrated defensive platform:
- **Correlating alerts into unified attack chains** rather than drowning analysts in isolated events.
- **Prioritizing threats using deterministic ML risk scoring** with feature attribution.
- **Accelerating forensic analysis with structured AI investigation** while keeping the AI strictly advisory.
- **Enforcing strict containment gates for incident response** via simulation sandboxing and analyst approval requirements.

---

## 🏗️ System Architecture

```
Wazuh / Sysmon / Synthetic JSON
       │
       ▼
WazuhAlertAdapter (Direct Ingestion)
       │
       ▼
NormalizationService (Canonical Event Model)
       │
       ▼
EventPipeline
       ├──► EventProcessingService (Audit Logging & Event Persistence)
       ├──► DetectionEngine (Built-in Rules mapped to MITRE ATT&CK)
       │       │
       │       ▼
       ├──► AlertService (Deterministic Alert Creation)
       │       │
       │       ▼
       ├──► CorrelationEngine (Multi-Alert Attack Sequence Correlation)
       │       │
       │       ▼
       ├──► IncidentService (Incident Lifecycle & Aggregate Evidence)
       │       │
       │       ▼
       ├──► ML Risk Scoring (Logistic Regression Feature Attribution)
       │       │
       │       ▼
       ├──► Threat Intelligence (Automated IOC Extraction & Enrichment)
       │
       ├──► AI Investigator (Structured Advisory Findings: Observed/Inferred)
       │
       ├──► SOC Case Management (Notes, Assignees, Evidence Pointers)
       │
       └──► Controlled Response (Simulation-Only, Analyst-Approved Sandbox)
              │
              ▼
    Next.js SOC Dashboard (Real-Time Operations & Workspace)
```

---

## ⚡ Major Capabilities

1. **Wazuh & Telemetry Ingestion (`WazuhAlertAdapter`)**:
   - Ingests raw Wazuh alert JSON records directly into canonical `NormalizedEvent` objects.
   - Bypasses the known OpenSearch 2.x / Filebeat 7.10.2 bulk indexing `_type` limitation without requiring Docker/Elasticsearch configuration tampering.
   - Idempotent event processing based on deterministic alert IDs.
   - Automatic redaction of credentials, passwords, session tokens, and API keys.

2. **Detection & Correlation Engine**:
   - Evaluates telemetry against built-in rules (e.g. `T1059` Command Execution, `T1110` Brute Force Authentication).
   - Correlates disparate alerts sharing entities (users, source IPs, hosts) within configurable time windows into coherent Incidents.

3. **ML Risk Scoring**:
   - Scores active incidents from 0 to 100 with clear risk levels (LOW, MEDIUM, HIGH, CRITICAL).
   - Provides transparent feature contribution weights (e.g. severity weighting, entity diversity, attack sequence indicators).
   - *Note: Trained and evaluated using synthetic development datasets for deterministic baseline evaluation.*

4. **Threat Intelligence Enrichment**:
   - Extracts observable IOCs (IPv4, domains, URLs, hashes) automatically from incident telemetry.
   - Enriches indicators with classification, reputation scores, and provider explanations.

5. **AI Investigator (Advisory Analysis)**:
   - On-demand incident analysis generating structured findings:
     - **OBSERVED**: Empirically confirmed telemetry and alert evidence.
     - **INFERRED**: Probable attacker tactics, MITRE ATT&CK associations.
     - **RECOMMENDED**: Concrete investigative steps and containment suggestions.
   - Highlights gaps in collected telemetry (e.g. missing network flow logs).
   - **Strictly Advisory**: Labeled as non-destructive recommendations requiring analyst validation.

6. **SOC Case Management**:
   - Comprehensive case tracking, priority assignment, analyst assignment, append-only notes, and evidence reference pointers.

7. **Controlled Response Safety Model (Phase 10)**:
   - **SIMULATION ONLY**: Actions model containment and remediation without modifying host, network, file, or account state.
   - **Analyst Approval Required**: Enforces a strict state machine (`PROPOSED` → `APPROVED` / `REJECTED` → `EXECUTED`). Direct execution of unapproved actions is blocked.
   - **Allowlisted Actions**: Restricted to `isolate_endpoint`, `quarantine_file`, and `revoke_credentials`.
   - Complete audit logging of actors, approval timestamps, and simulated outcomes.

8. **Next.js SOC Operations Dashboard**:
   - Real-time KPI summaries, threat activity charts, MITRE ATT&CK distribution, and active alert streams.
   - 8-tab deep-dive Incident Workspace (Overview, Timeline, Evidence, ML Risk, AI Investigation, Threat Intelligence, Case, Response).
   - Resilient multi-endpoint loading via `Promise.allSettled` to prevent widget failures from blanking the console.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLModel (SQLAlchemy ORM), SQLite.
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide React, Recharts.
- **Machine Learning**: Scikit-Learn (Logistic Regression risk baseline).
- **Telemetry & SIEM**: Wazuh Manager 4.9, Sysmon, Filebeat (Docker / WSL2).
- **Testing & Quality**: Pytest (223 tests), Next.js Turbopack compiler.

---

## 🚀 Local Setup & Instructions

### Prerequisites
- Windows 10/11 (or Linux/macOS)
- Python 3.11+
- Node.js 18+ and `pnpm` (or `npm`)

### 1. Backend Setup
```bash
# Clone the repository
cd IncidentForge

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend test suite
pytest -q
```

### 2. Frontend Setup
```bash
cd dashboard

# Install dependencies
pnpm install

# Build static production bundle
pnpm run build
```

### 3. Running Locally
Start the backend:
```bash
# From workspace root:
.venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Start the dashboard:
```bash
# From dashboard directory:
cd dashboard
pnpm run dev --port 3000
```
Visit **`http://localhost:3000`** in your browser. The dashboard will automatically connect to `http://127.0.0.1:8000` with the `API ONLINE` indicator.

---

## 🧪 Reproducible Demo Walkthrough

A complete, safe synthetic attack sequence demo is provided in [docs/demo_scenario.md](docs/demo_scenario.md):
1. Ingest synthetic authentication failures targeting test entity `user:sec_analyst_test` from documentation IP `198.51.100.23`.
2. Inspect the correlated Incident generated in the Next.js Overview.
3. Open the Incident Workspace to review the ML Risk score, AI Investigation report, Threat Intel IOCs, and simulate an analyst-approved `isolate_endpoint` action.

---

## 🔒 Security Boundaries & Limitations

- **Defensive & Simulated Only**: Response actions are strictly simulated; no shell execution, subprocess invocation, or endpoint modification takes place.
- **Safe RFC Test IPs**: All default fixtures and test scenarios use reserved documentation subnets (RFC 5737: `198.51.100.0/24`).
- **Credential Hygiene**: Automated sanitization strips passwords, tokens, API keys, and authorization headers from all ingested payloads and audit trails.
- **Model Evaluation**: ML risk models are trained on synthetic baseline datasets and intended for structured prioritization demonstration rather than production threat classification.
- **Known SIEM Limitation**: Wazuh 4.9 with embedded Filebeat 7.10.2 generates legacy `_type` bulk parameters rejected by OpenSearch 2.13. IncidentForge uses the direct `WazuhAlertAdapter` to consume alerts safely without modifying cluster infrastructure.

---

## 📊 Verification & Test Results

- **Backend Unit & Integration Tests**: **223 passed** in `13.13s` (100% pass rate across Detection, Correlation, Risk Scoring, Threat Intel, AI Investigator, Case Management, Response, and Wazuh Adapter).
- **Frontend Build**: **Clean build** (`next build` compiled with zero syntax or bundling errors).
- **Git Hygiene**: Clean diff, zero whitespace errors, zero secret leaks.

---

## 📜 License
This project is licensed under the MIT License for educational and portfolio demonstration purposes.
