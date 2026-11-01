import io
import re
from typing import List, Dict, Any
from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit


def clean_text(raw: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    if not raw:
        return ""
    # Remove null bytes and non-printable control chars
    cleaned = raw.replace("\x00", " ")
    cleaned = re.sub(r"[\r\t]+", " ", cleaned)
    # Replace multiple spaces with a single space
    cleaned = re.sub(r" +", " ", cleaned)
    # Collapse 3+ newlines into 2
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def extract_pdf_pages(file_stream, max_bytes: int = MAX_PDF_SIZE_BYTES) -> Dict[str, Any]:
    """
    Extracts text from a PDF file stream while strictly preserving 1-indexed page numbers.
    
    Returns:
        dict: {
            "page_count": int,
            "pages": List[{"page": int, "text": str}],
            "total_chars": int
        }
    Raises:
        ValueError on validation failure (empty, oversized, encrypted, corrupt, or scanned PDF).
    """
    # Check stream size
    if hasattr(file_stream, "seek") and hasattr(file_stream, "tell"):
        file_stream.seek(0, io.SEEK_END)
        size = file_stream.tell()
        file_stream.seek(0)
        if size > max_bytes:
            raise ValueError(f"File size ({size / (1024 * 1024):.1f} MB) exceeds maximum allowed limit of {max_bytes / (1024 * 1024):.0f} MB.")
        if size == 0:
            raise ValueError("The uploaded file is empty (0 bytes).")

    try:
        reader = PdfReader(file_stream)
    except PdfReadError as e:
        raise ValueError(f"Invalid or corrupted PDF file: {str(e)}")
    except Exception as e:
        raise ValueError(f"Could not read PDF: {str(e)}")

    if reader.is_encrypted:
        try:
            # Try decrypting with empty password
            decrypt_result = reader.decrypt("")
            if decrypt_result == 0:
                raise ValueError("The PDF is password protected. Please upload an unencrypted document.")
        except Exception:
            raise ValueError("The PDF is password protected. Please upload an unencrypted document.")

    page_count = len(reader.pages)
    if page_count == 0:
        raise ValueError("The PDF contains no pages.")

    pages: List[Dict[str, Any]] = []
    total_chars = 0

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        try:
            extracted = page.extract_text() or ""
        except Exception:
            extracted = ""
        
        cleaned = clean_text(extracted)
        total_chars += len(cleaned)
        pages.append({
            "page": page_num,
            "text": cleaned
        })

    # Validate that the PDF actually has readable text (not scanned images only)
    if total_chars < 30:
        raise ValueError(
            "This PDF appears to be empty or contains only scanned images without readable text. "
            "Please upload a text-based digital PDF."
        )

    return {
        "page_count": page_count,
        "pages": pages,
        "total_chars": total_chars
    }
