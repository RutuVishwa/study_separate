import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Allowed 3rd semester subjects (STRICT)
ALLOWED_SUBJECTS = [
    "Discrete Mathematics",
    "DSA",
    "OOP",
    "DBMS",
    "LDM"
]

# File processing limits & configuration
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".py",
    ".java",
    ".js",
    ".ts",
    ".txt",
    ".md"
}

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_CLASSIFICATION_CHARS = 30000
CONFIDENCE_THRESHOLD = 0.65

# Storage directories. We prefer DATA_DIR from env (e.g. a persistent volume),
# but must fall back to an app-local directory on hosts like Render free-tier
# web services where persistent disks are not available and mount paths like
# /data are either not present or not writable.
def _resolve_data_dir() -> Path:
    candidates = []
    env_dir = os.getenv("DATA_DIR")
    if env_dir:
        candidates.append(Path(env_dir))
    candidates.append(BASE_DIR)
    candidates.append(Path(__file__).resolve().parent.parent / "data")
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            probe = candidate / ".write_test"
            probe.write_text("ok")
            probe.unlink()
            return candidate
        except Exception:
            continue
    raise RuntimeError("No writable data directory found. Please set DATA_DIR to a writable path.")

DATA_DIR = _resolve_data_dir()
UPLOADS_DIR = DATA_DIR / "uploads"
TEMP_DIR = DATA_DIR / "temp"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR}/study_organizer.db")

# AI API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen3.8-27b:free")
