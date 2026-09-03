"""Deterministic feature extraction for IncidentForge ML Risk Scoring."""

from datetime import datetime
import re
from typing import Any

from ..models.correlation import Correlation
from ..models.incidents import Incident

FEATURE_VERSION = "v1.0"

FEATURE_NAMES: list[str] = [
    "incident_severity",
    "correlation_severity",
    "alert_count",
    "event_count",
    "correlation_count",
    "mitre_count",
    "has_auth_attack",
    "has_suspicious_process",
    "has_network_activity",
    "has_privilege_escalation",
    "time_span_seconds",
    "entity_diversity",
]


def extract_features(
    incident: Incident,
    correlation: Correlation | None = None,
) -> dict[str, float]:
    """Extract bounded, numeric, deterministic features from an incident and its correlation.

    Strict security guarantees:
    - Never extracts passwords, tokens, API keys, credentials, or raw payloads.
    - All feature values are finite bounded floats.
    """
    # 1. Incident severity [0 - 15]
    inc_sev = float(max(0, min(15, incident.severity)))

    # 2. Correlation severity [0 - 15]
    if correlation is not None:
        corr_sev = float(max(0, min(15, correlation.severity)))
    else:
        corr_sev = inc_sev

    # 3. Alert count (>= 0)
    alert_count = float(max(0, len(incident.alert_ids)))

    # 4. Event count (>= 0)
    event_count = float(max(0, len(incident.event_ids)))

    # 5. Correlation count (>= 0)
    corr_count = float(max(1, len(incident.correlation_ids)))

    # 6. MITRE count (>= 0)
    mitre_count = float(len(set(incident.mitre_techniques)))

    # Collect indicators from tags, description, and correlation type
    indicators_text = " ".join(
        incident.tags
        + [incident.title, incident.description]
        + ([correlation.correlation_type, correlation.title] if correlation else [])
    ).lower()

    # 7. Authentication attack
    has_auth = 1.0 if ("auth" in indicators_text or "login" in indicators_text) else 0.0

    # 8. Suspicious process
    has_proc = (
        1.0
        if ("process" in indicators_text or "exec" in indicators_text or ".sh" in indicators_text)
        else 0.0
    )

    # 9. Network activity
    has_net = (
        1.0
        if ("network" in indicators_text or "connection" in indicators_text or "outbound" in indicators_text)
        else 0.0
    )

    # 10. Privilege escalation
    has_priv = (
        1.0
        if ("privilege" in indicators_text or "escalat" in indicators_text or "root" in indicators_text)
        else 0.0
    )

    # 11. Time span seconds (>= 0)
    if incident.first_seen and incident.last_seen:
        span = (incident.last_seen - incident.first_seen).total_seconds()
        time_span = float(max(0.0, span))
    else:
        time_span = 0.0

    # 12. Entity diversity (distinct hosts / users / entities tagged, bounded [1 - 20])
    entity_diversity = float(max(1, min(20, len(set(incident.tags)))))

    return {
        "incident_severity": inc_sev,
        "correlation_severity": corr_sev,
        "alert_count": alert_count,
        "event_count": event_count,
        "correlation_count": corr_count,
        "mitre_count": mitre_count,
        "has_auth_attack": has_auth,
        "has_suspicious_process": has_proc,
        "has_network_activity": has_net,
        "has_privilege_escalation": has_priv,
        "time_span_seconds": time_span,
        "entity_diversity": entity_diversity,
    }


def generate_reason_codes(
    features: dict[str, float],
    risk_score: int,
) -> list[str]:
    """Generate deterministic explainability reason codes from extracted feature signals."""
    reasons: list[str] = []

    if features.get("has_privilege_escalation", 0.0) >= 1.0:
        reasons.append("PRIVILEGE_ESCALATION")

    if features.get("has_suspicious_process", 0.0) >= 1.0:
        reasons.append("SUSPICIOUS_PROCESS_ACTIVITY")

    if features.get("has_network_activity", 0.0) >= 1.0:
        reasons.append("NETWORK_ACTIVITY")

    if features.get("has_auth_attack", 0.0) >= 1.0:
        reasons.append("AUTHENTICATION_ATTACK")

    if features.get("mitre_count", 0.0) >= 2.0:
        reasons.append("MULTIPLE_MITRE_TECHNIQUES")

    if features.get("alert_count", 0.0) >= 3.0:
        reasons.append("HIGH_ALERT_VOLUME")

    if features.get("correlation_severity", 0.0) >= 10.0:
        reasons.append("HIGH_CORRELATION_SEVERITY")

    if features.get("incident_severity", 0.0) >= 10.0:
        reasons.append("HIGH_INCIDENT_SEVERITY")

    if not reasons:
        reasons.append("BASELINE_RISK_FACTORS")

    return sorted(reasons)
