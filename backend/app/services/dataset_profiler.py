"""Dataset Profiler for IncidentForge v2.

Inspects synthetic/local datasets (CSV, JSON, Parquet) and determines:
- format
- record count
- column count and schema data types
- candidate sensitive fields (email, phone, address, employee_id, customer_id, account_id, salary, ssn, financial)
- sensitivity classification (LOW, MEDIUM, HIGH, CRITICAL)
- deterministic schema hash

STRICT CONSTRAINTS:
- Heuristic/rule-based metadata classification only (no claim of perfect PII detection).
- Read-only inspection; bounds memory usage by streaming or sample inspection.
- Purely file-based; no database engine or external network calls.
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
from pathlib import Path
import re
from typing import Any

from ..models.dataset import (
    ColumnProfile,
    DataFormat,
    DatasetAsset,
    SensitivityLevel,
)

logger = logging.getLogger(__name__)

# Deterministic patterns for candidate sensitive columns and values
# Matches column names (lowercased, punctuation-stripped)
_CRITICAL_PATTERNS = [
    re.compile(r"(?i)\b(ssn|social_security|national_id|tax_id|sin)\b"),
    re.compile(r"(?i)\b(credit_card|card_num|pan|cvv|cvc|banking_pin|private_key|secret_key)\b"),
]

_HIGH_PATTERNS = [
    re.compile(r"(?i)\b(salary|compensation|wage|bank_account|account_num|account_id|routing_num|iban|swift|financial|revenue|bonus|payroll)\b"),
    re.compile(r"(?i)\b(medical_record|health_id|patient_id|diagnosis|biometric)\b"),
]

_MEDIUM_PATTERNS = [
    re.compile(r"(?i)\b(email|phone|telephone|mobile|address|street|zip_code|postal_code|birth_date|dob|employee_id|customer_id|user_id|passport|driver_license)\b"),
]

# Value-level regex patterns for sample data inspection
_VALUE_SSN_PATTERN = re.compile(r"^\d{3}-\d{2}-\d{4}$")
_VALUE_EMAIL_PATTERN = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")
_VALUE_PHONE_PATTERN = re.compile(r"^\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$")
_VALUE_CREDIT_CARD_PATTERN = re.compile(r"^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$")


class DatasetProfiler:
    """Deterministic, read-only dataset profiler and sensitivity classifier."""

    @staticmethod
    def classify_column(name: str, sample_values: list[Any] | None = None) -> tuple[bool, str | None, SensitivityLevel]:
        """Classify a single column by name and sample values.

        Returns (is_sensitive, pii_type, sensitivity_level).
        """
        col_norm = name.strip().lower().replace("-", "_").replace(" ", "_")

        # 1. Critical column name matches
        for pattern in _CRITICAL_PATTERNS:
            if pattern.search(col_norm):
                if "ssn" in col_norm or "social" in col_norm or "national" in col_norm:
                    return True, "ssn", SensitivityLevel.CRITICAL
                if "card" in col_norm or "cvv" in col_norm or "pan" in col_norm:
                    return True, "credit_card", SensitivityLevel.CRITICAL
                return True, "credential_or_identity", SensitivityLevel.CRITICAL

        # 2. High column name matches
        for pattern in _HIGH_PATTERNS:
            if pattern.search(col_norm):
                if "salary" in col_norm or "compensation" in col_norm or "payroll" in col_norm:
                    return True, "salary", SensitivityLevel.HIGH
                if "account" in col_norm or "iban" in col_norm or "bank" in col_norm:
                    return True, "account_id", SensitivityLevel.HIGH
                return True, "financial", SensitivityLevel.HIGH

        # 3. Medium column name matches
        for pattern in _MEDIUM_PATTERNS:
            if pattern.search(col_norm):
                if "email" in col_norm:
                    return True, "email", SensitivityLevel.MEDIUM
                if "phone" in col_norm or "mobile" in col_norm:
                    return True, "phone", SensitivityLevel.MEDIUM
                if "address" in col_norm or "zip" in col_norm or "street" in col_norm:
                    return True, "address", SensitivityLevel.MEDIUM
                if "employee" in col_norm:
                    return True, "employee_id", SensitivityLevel.MEDIUM
                if "customer" in col_norm:
                    return True, "customer_id", SensitivityLevel.MEDIUM
                return True, "personal_identifier", SensitivityLevel.MEDIUM

        # 4. Check sample values if available
        if sample_values:
            non_empty = [str(v).strip() for v in sample_values if v is not None and str(v).strip()]
            for val in non_empty[:20]:
                if _VALUE_SSN_PATTERN.match(val):
                    return True, "ssn", SensitivityLevel.CRITICAL
                if _VALUE_CREDIT_CARD_PATTERN.match(val):
                    return True, "credit_card", SensitivityLevel.CRITICAL
                if _VALUE_EMAIL_PATTERN.match(val):
                    return True, "email", SensitivityLevel.MEDIUM
                if _VALUE_PHONE_PATTERN.match(val):
                    return True, "phone", SensitivityLevel.MEDIUM

        return False, None, SensitivityLevel.LOW

    @classmethod
    def profile_csv(cls, path: Path) -> tuple[int, list[ColumnProfile]]:
        """Profile a CSV file safely by reading headers and sampling up to 100 rows."""
        record_count = 0
        columns: list[ColumnProfile] = []

        with open(path, mode="r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            if not headers:
                return 0, []

            samples: dict[str, list[Any]] = {h: [] for h in headers}
            for row in reader:
                record_count += 1
                if record_count <= 100:
                    for i, h in enumerate(headers):
                        if i < len(row):
                            samples[h].append(row[i])

            for h in headers:
                is_sens, pii, sens = cls.classify_column(h, samples.get(h, []))
                # Infer type
                sample_col = samples.get(h, [])
                inferred_type = cls._infer_type(sample_col)
                columns.append(
                    ColumnProfile(
                        name=h,
                        data_type=inferred_type,
                        is_sensitive=is_sens,
                        pii_type=pii,
                        sensitivity=sens,
                    )
                )

        return record_count, columns

    @classmethod
    def profile_json(cls, path: Path) -> tuple[int, list[ColumnProfile]]:
        """Profile a JSON or JSONL file safely."""
        record_count = 0
        columns: list[ColumnProfile] = []

        with open(path, mode="r", encoding="utf-8", errors="replace") as f:
            first_char = ""
            while True:
                ch = f.read(1)
                if not ch:
                    break
                if not ch.isspace():
                    first_char = ch
                    break
            f.seek(0)

            if first_char == "[":
                # JSON array
                try:
                    data = json.load(f)
                    if isinstance(data, list):
                        record_count = len(data)
                        sample_records = data[:100]
                        all_keys: set[str] = set()
                        for rec in sample_records:
                            if isinstance(rec, dict):
                                all_keys.update(rec.keys())

                        for key in sorted(all_keys):
                            col_samples = [rec.get(key) for rec in sample_records if isinstance(rec, dict)]
                            is_sens, pii, sens = cls.classify_column(key, col_samples)
                            inferred_type = cls._infer_type(col_samples)
                            columns.append(
                                ColumnProfile(
                                    name=key,
                                    data_type=inferred_type,
                                    is_sensitive=is_sens,
                                    pii_type=pii,
                                    sensitivity=sens,
                                )
                            )
                except Exception as exc:
                    logger.warning("Failed to parse JSON array in %s: %s", path, exc)
            else:
                # JSON Lines
                f.seek(0)
                sample_records = []
                for line in f:
                    line_str = line.strip()
                    if line_str:
                        record_count += 1
                        if len(sample_records) < 100:
                            try:
                                sample_records.append(json.loads(line_str))
                            except Exception:
                                pass

                all_keys = set()
                for rec in sample_records:
                    if isinstance(rec, dict):
                        all_keys.update(rec.keys())

                for key in sorted(all_keys):
                    col_samples = [rec.get(key) for rec in sample_records if isinstance(rec, dict)]
                    is_sens, pii, sens = cls.classify_column(key, col_samples)
                    inferred_type = cls._infer_type(col_samples)
                    columns.append(
                        ColumnProfile(
                            name=key,
                            data_type=inferred_type,
                            is_sensitive=is_sens,
                            pii_type=pii,
                            sensitivity=sens,
                        )
                    )

        return record_count, columns

    @classmethod
    def profile_parquet(cls, path: Path) -> tuple[int, list[ColumnProfile]]:
        """Profile a Parquet file safely using fastparquet metadata without loading full dataset into memory."""
        try:
            import fastparquet
            pf = fastparquet.ParquetFile(str(path))
            record_count = int(pf.count)
            columns: list[ColumnProfile] = []

            # fastparquet schema columns
            for col_name in pf.columns:
                # Get column type
                col_type = "string"
                if hasattr(pf, "dtypes") and col_name in pf.dtypes:
                    col_type = str(pf.dtypes[col_name])

                # Sample inspection if fastparquet allows head
                sample_vals: list[Any] = []
                try:
                    df_sample = pf.to_pandas(columns=[col_name])[:20]
                    sample_vals = df_sample[col_name].tolist()
                except Exception:
                    pass

                is_sens, pii, sens = cls.classify_column(col_name, sample_vals)
                columns.append(
                    ColumnProfile(
                        name=col_name,
                        data_type=col_type,
                        is_sensitive=is_sens,
                        pii_type=pii,
                        sensitivity=sens,
                    )
                )
            return record_count, columns
        except Exception as exc:
            logger.error("Error profiling parquet file %s: %s", path, exc)
            return 0, []

    @classmethod
    def profile_file(
        cls,
        file_path: str | Path,
        dataset_id: str | None = None,
        name: str | None = None,
    ) -> DatasetAsset:
        """Profile a file and return a fully classified DatasetAsset domain model."""
        p = Path(file_path)
        if not p.exists():
            raise FileNotFoundError(f"Dataset file not found: {file_path}")

        ext = p.suffix.lower().lstrip(".")
        if ext == "csv":
            fmt = DataFormat.CSV
            record_count, columns = cls.profile_csv(p)
        elif ext in ("json", "jsonl"):
            fmt = DataFormat.JSON
            record_count, columns = cls.profile_json(p)
        elif ext in ("parquet", "pq"):
            fmt = DataFormat.PARQUET
            record_count, columns = cls.profile_parquet(p)
        else:
            raise ValueError(f"Unsupported dataset format '{ext}'. Must be csv, json, or parquet.")

        # Compute overall dataset sensitivity
        overall_sensitivity = SensitivityLevel.LOW
        sensitive_cols: list[str] = []

        for col in columns:
            if col.is_sensitive:
                sensitive_cols.append(col.name)
            if col.sensitivity == SensitivityLevel.CRITICAL:
                overall_sensitivity = SensitivityLevel.CRITICAL
            elif col.sensitivity == SensitivityLevel.HIGH and overall_sensitivity not in (SensitivityLevel.CRITICAL,):
                overall_sensitivity = SensitivityLevel.HIGH
            elif col.sensitivity == SensitivityLevel.MEDIUM and overall_sensitivity not in (
                SensitivityLevel.CRITICAL,
                SensitivityLevel.HIGH,
            ):
                overall_sensitivity = SensitivityLevel.MEDIUM

        # Compute schema hash
        schema_signature = ":".join(f"{c.name}:{c.data_type}" for c in sorted(columns, key=lambda x: x.name))
        schema_hash = hashlib.sha256(schema_signature.encode("utf-8")).hexdigest()[:16]

        ds_id = dataset_id or f"dset-{hashlib.sha256(str(p.name).encode()).hexdigest()[:12]}"
        ds_name = name or p.stem

        return DatasetAsset(
            dataset_id=ds_id,
            name=ds_name,
            format=fmt,
            file_path=str(p.resolve()),
            size_bytes=p.stat().st_size if p.exists() else 0,
            record_count=record_count,
            column_count=len(columns),
            columns=columns,
            sensitive_columns=sensitive_cols,
            sensitivity=overall_sensitivity,
            schema_hash=schema_hash,
            metadata={
                "profiler_version": "v2.0",
                "classification_mode": "deterministic_heuristic",
            },
        )

    @staticmethod
    def _infer_type(sample_values: list[Any]) -> str:
        """Infer basic data type from sample values."""
        non_empty = [v for v in sample_values if v is not None and str(v).strip()]
        if not non_empty:
            return "string"

        all_int = True
        all_float = True
        for v in non_empty:
            s = str(v).strip()
            try:
                int(s)
            except ValueError:
                all_int = False
            try:
                float(s)
            except ValueError:
                all_float = False

        if all_int:
            return "integer"
        if all_float:
            return "float"
        return "string"
