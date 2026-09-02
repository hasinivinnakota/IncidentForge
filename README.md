<p align="center">
     <h1 align="center">🛡️ INCIDENTFORGE</h1>
  <p align="center">
    <strong>AI-Assisted SOC Investigation & Automated Incident Response Platform</strong>
  </p>
  <p align="center">
    A defensive cybersecurity portfolio project demonstrating end-to-end SOC operations — from endpoint telemetry collection through AI-assisted investigation to automated incident response.
  </p>
</p>

---

## 🎯 Overview

IncidentForge is an authorized defensive cybersecurity laboratory that integrates:

- **Endpoint Telemetry** — Windows event collection via Sysmon
- **SIEM** — Wazuh Manager for log aggregation, alerting, and rule-based detection
- **Detection Engineering** — Custom detection rules mapped to MITRE ATT&CK
- **Threat Intelligence** — Automated IOC enrichment from open-source feeds
- **Alert Pipeline** — Normalization → Correlation → Enrichment
- **ML Risk Scoring** — Machine learning model for prioritizing alerts by risk
- **AI Investigation** — LLM-assisted analysis and human-readable incident explanations
- **SOC Dashboard** — Real-time security operations center interface
- **Automated Response** — Playbook-driven incident response with analyst approval gates
- **Audit Trail** — Complete logging of all investigation and response actions

## 🏗️ Architecture

```
Windows Endpoint (Sysmon + Wazuh Agent)
        ↓
   Wazuh Manager / SIEM  (Docker)
        ↓
   Alert Normalization
        ↓
   Threat Intelligence Enrichment
        ↓
   Incident Correlation
        ↓
   ML Risk Scoring
        ↓
   AI-Assisted Investigation
        ↓
   SOC Dashboard
        ↓
   Response Decision (Auto / Analyst-Approved)
        ↓
   Response Verification
        ↓
   Audit Trail
```

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Endpoint Telemetry | Sysmon, Windows Event Logs |
| SIEM | Wazuh 4.x (Docker) |
| Backend API | Python / FastAPI |
| ML Risk Scoring | scikit-learn, XGBoost |
| AI Investigation | API-based LLM (OpenAI / Google Gemini) |
| SOC Dashboard | Vite + React |
| Infrastructure | Docker Compose, WSL2 |
| Detection Rules | Custom Wazuh rules, MITRE ATT&CK mappings |

## 📁 Project Structure

```
IncidentForge/
├── backend/              # FastAPI backend API
├── dashboard/            # React SOC dashboard
├── infrastructure/       # Docker & configuration files
│   ├── docker/           # Wazuh container configs
│   └── configs/          # Sysmon & Wazuh configs
├── detection/            # Detection rules & MITRE mappings
├── threat-intel/         # Threat intelligence enrichment
├── pipeline/             # Alert normalization & correlation
├── ml/                   # ML risk scoring models
├── ai-investigator/      # AI-assisted investigation engine
├── response-engine/      # Automated response playbooks
├── datasets/             # Sample data & attack simulations
├── tests/                # Unit, integration, and E2E tests
├── scripts/              # Utility & simulation scripts
├── evaluation/           # Metrics & benchmarks
└── docs/                 # Project documentation
```

## ⚠️ Disclaimer

This project is an **authorized defensive cybersecurity laboratory** designed for educational and portfolio purposes. All activity is:

- Conducted on the operator's own local environment
- Limited to defensive security operations
- Using benign simulation artifacts only (no real malware)
- Isolated from external networks
- Not targeting any external systems

**No offensive activity is performed against real systems.**

## 📋 Project Phases

- [x] **Phase 0** — Environment Assessment
- [ ] **Phase 1** — Foundation Setup (Docker, WSL2, Repository)
- [ ] **Phase 2** — Wazuh SIEM Deployment
- [ ] **Phase 3** — Endpoint Telemetry (Sysmon + Wazuh Agent)
- [ ] **Phase 4** — Detection Engineering & MITRE Mapping
- [ ] **Phase 5** — Alert Pipeline (Normalization, Correlation, Enrichment)
- [ ] **Phase 6** — ML Risk Scoring
- [ ] **Phase 7** — AI-Assisted Investigation
- [ ] **Phase 8** — SOC Dashboard
- [ ] **Phase 9** — Automated Response Engine
- [ ] **Phase 10** — Evaluation, Testing & Documentation

## 📄 License

This project is for educational and portfolio demonstration purposes.

## 👤 Author

**Hasini Vinnakota**
