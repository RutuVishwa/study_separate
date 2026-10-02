import os
import uuid
import re
import shutil
from pathlib import Path
from app.config import UPLOADS_DIR, TEMP_DIR, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES

def sanitize_filename(filename: str) -> str:
    """Sanitize the original filename to prevent path traversal or filesystem issues."""
    filename = Path(filename).name
    # Keep alphanumeric, dots, underscores, hyphens
    sanitized = re.sub(r'[^\w\.-]', '_', filename)
    return sanitized if sanitized else "unnamed_file"

def get_file_extension(filename: str) -> str:
    """Return lowercase file extension with dot (e.g. '.cpp')."""
    return Path(filename).suffix.lower()

def is_allowed_extension(filename: str) -> bool:
    """Check if file extension is supported."""
    ext = get_file_extension(filename)
    return ext in ALLOWED_EXTENSIONS

def generate_stored_filename(original_filename: str) -> str:
    """Generate a unique server-side filename."""
    ext = get_file_extension(original_filename)
    safe_name = sanitize_filename(original_filename)
    base_name = Path(safe_name).stem
    unique_id = uuid.uuid4().hex[:12]
    return f"{unique_id}_{base_name}{ext}"

def save_uploaded_file(file_bytes: bytes, original_filename: str, is_temp: bool = False) -> tuple[str, Path]:
    """
    Save raw file bytes to disk in uploads or temp directory.
    Returns (stored_filename, absolute_path).
    """
    stored_name = generate_stored_filename(original_filename)
    target_dir = TEMP_DIR if is_temp else UPLOADS_DIR
    target_path = target_dir / stored_name

    with open(target_path, "wb") as f:
        f.write(file_bytes)

    return stored_name, target_path

def move_temp_to_uploads(temp_filename: str) -> tuple[str, Path]:
    """Move a file from temp directory to final uploads directory."""
    temp_path = TEMP_DIR / temp_filename
    if not temp_path.exists():
        raise FileNotFoundError(f"Temp file {temp_filename} not found.")

    target_path = UPLOADS_DIR / temp_filename
    shutil.move(str(temp_path), str(target_path))
    return temp_filename, target_path

def delete_file(file_path_str: str) -> bool:
    """Delete a stored file safely."""
    path = Path(file_path_str)
    if path.exists():
        try:
            path.unlink()
            return True
        except Exception:
            return False
    return False
