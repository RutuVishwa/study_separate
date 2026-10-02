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

# Storage directories
UPLOADS_DIR = BASE_DIR / "uploads"
TEMP_DIR = BASE_DIR / "temp"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/study_organizer.db")

# AI API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
