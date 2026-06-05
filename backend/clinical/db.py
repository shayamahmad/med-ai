"""SQLite persistence for disease clinical profiles."""

import json
import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from clinical.schemas import DiseaseProfile, MedicationCategory
from clinical.utils import parse_json_list, parse_json_meds, slugify

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "clinical.db"
SEED_PATH = Path(__file__).resolve().parent / "seed_diseases.json"

DISCLAIMER = (
    "For educational purposes only. This information does not replace professional "
    "medical advice, diagnosis, or treatment. Always consult a licensed healthcare "
    "provider. No medication dosages or personalized prescriptions are provided."
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS diseases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    aliases TEXT NOT NULL DEFAULT '[]',
    severity TEXT NOT NULL,
    overview TEXT NOT NULL,
    underlying_cause TEXT NOT NULL,
    first_line_treatment TEXT NOT NULL DEFAULT '[]',
    management_strategies TEXT NOT NULL DEFAULT '[]',
    supportive_care TEXT NOT NULL DEFAULT '[]',
    medication_categories TEXT NOT NULL DEFAULT '[]',
    home_care TEXT NOT NULL DEFAULT '[]',
    diagnostic_tests TEXT NOT NULL DEFAULT '[]',
    recovery_timeline TEXT NOT NULL DEFAULT '',
    prevention TEXT NOT NULL DEFAULT '[]',
    warning_signs TEXT NOT NULL DEFAULT '[]',
    patient_education TEXT NOT NULL DEFAULT '[]',
    disclaimer TEXT NOT NULL,
    generated_by_ai INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diseases_slug ON diseases(slug);
CREATE INDEX IF NOT EXISTS idx_diseases_name ON diseases(name);
"""


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_clinical_db() -> None:
    with _connect() as conn:
        conn.executescript(SCHEMA)
        count = conn.execute("SELECT COUNT(*) FROM diseases").fetchone()[0]
        if count == 0 and SEED_PATH.exists():
            seed = json.loads(SEED_PATH.read_text(encoding="utf-8"))
            for item in seed:
                upsert_disease(conn, item, generated_by_ai=False)
            logger.info("[Clinical] Seeded %s disease profiles", len(seed))


def _row_to_profile(row: sqlite3.Row) -> DiseaseProfile:
    meds = [
        MedicationCategory(**item)
        for item in parse_json_meds(row["medication_categories"])
    ]
    return DiseaseProfile(
        slug=row["slug"],
        name=row["name"],
        aliases=parse_json_list(row["aliases"]),
        severity=row["severity"],
        overview=row["overview"],
        underlying_cause=row["underlying_cause"],
        first_line_treatment=parse_json_list(row["first_line_treatment"]),
        management_strategies=parse_json_list(row["management_strategies"]),
        supportive_care=parse_json_list(row["supportive_care"]),
        medication_categories=meds,
        home_care=parse_json_list(row["home_care"]),
        diagnostic_tests=parse_json_list(row["diagnostic_tests"]),
        recovery_timeline=row["recovery_timeline"] or "",
        prevention=parse_json_list(row["prevention"]),
        warning_signs=parse_json_list(row["warning_signs"]),
        patient_education=parse_json_list(row["patient_education"]),
        disclaimer=row["disclaimer"],
        generated_by_ai=bool(row["generated_by_ai"]),
    )


def upsert_disease(conn: sqlite3.Connection, data: dict, generated_by_ai: bool = False) -> str:
    now = datetime.now(timezone.utc).isoformat()
    slug = data.get("slug") or slugify(data["name"])
    payload = {
        "slug": slug,
        "name": data["name"],
        "aliases": json.dumps(data.get("aliases", [])),
        "severity": data.get("severity", "moderate"),
        "overview": data.get("overview", ""),
        "underlying_cause": data.get("underlying_cause", ""),
        "first_line_treatment": json.dumps(data.get("first_line_treatment", [])),
        "management_strategies": json.dumps(data.get("management_strategies", [])),
        "supportive_care": json.dumps(data.get("supportive_care", [])),
        "medication_categories": json.dumps(data.get("medication_categories", [])),
        "home_care": json.dumps(data.get("home_care", [])),
        "diagnostic_tests": json.dumps(data.get("diagnostic_tests", [])),
        "recovery_timeline": data.get("recovery_timeline", ""),
        "prevention": json.dumps(data.get("prevention", [])),
        "warning_signs": json.dumps(data.get("warning_signs", [])),
        "patient_education": json.dumps(data.get("patient_education", [])),
        "disclaimer": data.get("disclaimer", DISCLAIMER),
        "generated_by_ai": 1 if generated_by_ai else 0,
        "created_at": now,
        "updated_at": now,
    }
    conn.execute(
        """
        INSERT INTO diseases (
            slug, name, aliases, severity, overview, underlying_cause,
            first_line_treatment, management_strategies, supportive_care,
            medication_categories, home_care, diagnostic_tests, recovery_timeline,
            prevention, warning_signs, patient_education, disclaimer,
            generated_by_ai, created_at, updated_at
        ) VALUES (
            :slug, :name, :aliases, :severity, :overview, :underlying_cause,
            :first_line_treatment, :management_strategies, :supportive_care,
            :medication_categories, :home_care, :diagnostic_tests, :recovery_timeline,
            :prevention, :warning_signs, :patient_education, :disclaimer,
            :generated_by_ai, :created_at, :updated_at
        )
        ON CONFLICT(slug) DO UPDATE SET
            name=excluded.name,
            aliases=excluded.aliases,
            severity=excluded.severity,
            overview=excluded.overview,
            underlying_cause=excluded.underlying_cause,
            first_line_treatment=excluded.first_line_treatment,
            management_strategies=excluded.management_strategies,
            supportive_care=excluded.supportive_care,
            medication_categories=excluded.medication_categories,
            home_care=excluded.home_care,
            diagnostic_tests=excluded.diagnostic_tests,
            recovery_timeline=excluded.recovery_timeline,
            prevention=excluded.prevention,
            warning_signs=excluded.warning_signs,
            patient_education=excluded.patient_education,
            disclaimer=excluded.disclaimer,
            generated_by_ai=excluded.generated_by_ai,
            updated_at=excluded.updated_at
        """,
        payload,
    )
    return slug


def get_disease_by_slug(slug: str) -> DiseaseProfile | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM diseases WHERE slug = ?",
            (slug,),
        ).fetchone()
        return _row_to_profile(row) if row else None


def find_disease_by_name(name: str) -> DiseaseProfile | None:
    slug = slugify(name)
    profile = get_disease_by_slug(slug)
    if profile:
        return profile

    needle = name.strip().lower()
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM diseases").fetchall()
        for row in rows:
            if row["name"].lower() == needle:
                return _row_to_profile(row)
            aliases = parse_json_list(row["aliases"])
            if any(alias.lower() == needle for alias in aliases):
                return _row_to_profile(row)
            if needle in row["name"].lower() or row["name"].lower() in needle:
                return _row_to_profile(row)
    return None


def save_generated_profile(data: dict) -> DiseaseProfile:
    with _connect() as conn:
        slug = upsert_disease(conn, data, generated_by_ai=True)
    profile = get_disease_by_slug(slug)
    if profile is None:
        raise RuntimeError("Failed to save generated disease profile")
    return profile


def list_disease_slugs(limit: int = 500, offset: int = 0) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT slug, name, severity
            FROM diseases
            ORDER BY name
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        ).fetchall()
    return [dict(row) for row in rows]
