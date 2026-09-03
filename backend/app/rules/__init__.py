"""Built-in detection rule registry."""

from ..models.rules import DetectionRule
from .builtin import (
    AuthenticationFailureRule,
    HighSeverityRule,
    NetworkConnectionAnomalyRule,
    PrivilegeEscalationRule,
    SuspiciousProcessRule,
)
from .correlation_base import CorrelationRule
from .correlation_builtin import (
    AuthenticationAttackSequenceRule,
    PrivilegeEscalationSequenceRule,
    ProcessNetworkSequenceRule,
    SameEntityCorrelationRule,
    get_default_correlation_rules,
)


def get_default_rules() -> list[DetectionRule]:
    """Return the standard built-in rule set."""
    return [
        HighSeverityRule(),
        SuspiciousProcessRule(),
        AuthenticationFailureRule(),
        NetworkConnectionAnomalyRule(),
        PrivilegeEscalationRule(),
    ]


__all__ = [
    "AuthenticationAttackSequenceRule",
    "AuthenticationFailureRule",
    "CorrelationRule",
    "HighSeverityRule",
    "NetworkConnectionAnomalyRule",
    "PrivilegeEscalationRule",
    "PrivilegeEscalationSequenceRule",
    "ProcessNetworkSequenceRule",
    "SameEntityCorrelationRule",
    "SuspiciousProcessRule",
    "get_default_correlation_rules",
    "get_default_rules",
]
