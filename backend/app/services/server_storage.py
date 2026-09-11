import uuid
import logging
from pathlib import Path
from typing import Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Base path for uploaded media files
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
upload_dir_setting = Path(settings.UPLOAD_DIR)
if upload_dir_setting.is_absolute():
    UPLOADS_PATH = upload_dir_setting
else:
    UPLOADS_PATH = BACKEND_ROOT / settings.UPLOAD_DIR
UPLOADS_PATH.mkdir(parents=True, exist_ok=True)

def generate_file_key(issue_tracking_code: str, file_type: str = "before", ext: str = "jpg") -> str:
    unique_id = uuid.uuid4().hex[:8]
    clean_ext = ext.lstrip(".") or "jpg"
    return f"issues/{issue_tracking_code}/{file_type}_{unique_id}.{clean_ext}"

def get_public_url(file_key: str) -> str:
    clean_key = file_key.lstrip("/")
    return f"/uploads/{clean_key}"

def save_uploaded_bytes(file_bytes: bytes, file_key: str) -> str:
    """
    Save raw bytes directly onto the server disk.
    Returns the public relative URL to access the uploaded file.
    """
    target_path = UPLOADS_PATH / file_key
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(file_bytes)
    return get_public_url(file_key)

async def generate_presigned_upload_url(
    file_key: str,
    content_type: str = "image/jpeg",
    expires_in: int = 3600
) -> Dict[str, str]:
    """
    Direct server upload URL generator.
    """
    return {
        "upload_url": f"/api/v1/issues/upload?file_key={file_key}",
        "public_url": get_public_url(file_key)
    }
