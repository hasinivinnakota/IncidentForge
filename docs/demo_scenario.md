# IncidentForge — End-to-End Synthetic SOC Demo Scenario

This guide provides a reproducible, non-destructive SOC demonstration walkthrough using safe RFC 5737 documentation IP addresses and synthetic user entities.

---

## 1. Scenario Overview: Multi-Stage Authentication Attack Sequence

In this scenario:
1. An adversary attempts repeated brute-force authentication against a protected user account (`sec_analyst_test`) from an external IP (`198.51.100.23`).
2. Wazuh alerts are ingested into IncidentForge via `WazuhAlertAdapter` (or `POST /api/v1/events`).
3. The **Detection Engine** flags both events as `builtin-003` (`Authentication Failure`, MITRE `T1110`).
4. The **Correlation Engine** recognizes the sequence targeting the same entity within a 15-minute window (`corr-rule-001`) and creates an active **Incident**.
5. The **ML Risk Scorer** computes a deterministic risk assessment score and top feature contributions.
6. The **Threat Intelligence** service extracts observed IOCs (`198.51.100.23`) and provides enrichment metadata.
7. The **AI Investigator** performs an automated advisory investigation with structured findings (Observed, Inferred, Recommended).
8. The analyst creates an investigation **Case**, proposes a **Controlled Response** action (`isolate_endpoint`), approves it, and simulates execution in strict containment.

---

## 2. Ingest Synthetic Alerts

You can ingest the alerts using Python or via HTTP `curl`/PowerShell commands against `http://127.0.0.1:8000/api/v1/events`.

### Event 1: Initial Authentication Failure
```json
{
  "event_id": "demo-auth-001",
  "timestamp": "2026-09-10T14:00:00Z",
  "source": "wazuh",
  "event_type": "authentication_failure",
  "severity": 6,
  "message": "Failed logon attempt for account sec_analyst_test from 198.51.100.23",
  "host": "linux-endpoint-01",
  "user": "sec_analyst_test",
  "source_ip": "198.51.100.23",
  "metadata": {
    "mitre_techniques": ["T1110"],
    "wazuh_rule_id": "5710"
  }
}
```

### Event 2: Repeated Authentication Failure (Triggers Correlation)
```json
{
  "event_id": "demo-auth-002",
  "timestamp": "2026-09-10T14:02:00Z",
  "source": "wazuh",
  "event_type": "authentication_failure",
  "severity": 6,
  "message": "Repeated authentication failure for sec_analyst_test from 198.51.100.23",
  "host": "linux-endpoint-01",
  "user": "sec_analyst_test",
  "source_ip": "198.51.100.23",
  "metadata": {
    "mitre_techniques": ["T1110"],
    "wazuh_rule_id": "5710"
  }
}
```

---

## 3. Verifying Results in Next.js SOC Dashboard

Open your browser to: `http://localhost:3000`

### Step 1: Operations Overview
- **Active Alerts**: Reflects the newly ingested alerts.
- **Active Incidents**: Shows the correlated incident:
  `Security Incident: Authentication Attack Sequence against user:sec_analyst_test`
- **MITRE ATT&CK Matrix**: Visualizes technique `T1110` (Brute Force).

### Step 2: Deep Dive in Incident Workspace
Click on the active incident from the incidents table to open the 8-tab Incident Workspace:
- **Overview**: View correlation linkages, alert IDs, and summary highlights.
- **Timeline**: Review the chronological progression of failed logons.
- **Evidence**: Inspect raw evidence payloads attached to the correlation.
- **ML Risk**: Inspect the calculated risk score (e.g. `7 / 100`) and feature contributions.
- **AI Investigation**: Inspect structured findings (`OBSERVED`, `INFERRED`, `RECOMMENDED`) with prominent `ADVISORY ONLY` labeling.
- **Threat Intelligence**: Review extracted IOCs (`198.51.100.23`) and threat reputation scores.
- **Case**: Link or review dedicated case investigation tracking.
- **Controlled Response**:
  1. Click **+ Propose Isolate Endpoint**.
  2. Review the proposed action in the queue.
  3. Click **Approve** (marks action as approved by analyst).
  4. Click **Simulate Execution** (executes strictly in safe local simulation).
  5. Note the result: `SIMULATION ONLY: endpoint associated with incident would be isolated. No network configuration or endpoint state was changed.`

---

## 4. Safety Guarantees During Demo
- **RFC 5737 Test IP**: `198.51.100.23` is reserved for documentation and testing; no real network packets are sent.
- **Credential Protection**: Any passwords or tokens entered in test events are automatically stripped and replaced with `[REDACTED]`.
- **Simulation Containment**: Response actions never modify network interfaces, registry, or endpoint state.
