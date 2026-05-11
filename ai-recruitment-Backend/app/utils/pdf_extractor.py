"""
PDF and document text extraction utilities.
Supports PDF, DOCX with fallback strategies.
"""
import io
import re
from pathlib import Path
from typing import Optional
import structlog

logger = structlog.get_logger()


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using pdfplumber (primary) with PyPDF2 fallback."""
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            full_text = "\n\n".join(pages)
            if full_text.strip():
                logger.info("PDF extracted with pdfplumber", chars=len(full_text))
                return clean_text(full_text)
    except Exception as e:
        logger.warning("pdfplumber failed, trying PyPDF2", error=str(e))

    # Fallback to PyPDF2
    try:
        import PyPDF2
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            full_text = "\n\n".join(pages)
            logger.info("PDF extracted with PyPDF2", chars=len(full_text))
            return clean_text(full_text)
    except Exception as e:
        logger.error("All PDF extraction methods failed", error=str(e))
        raise ValueError(f"Could not extract text from PDF: {e}")


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file."""
    try:
        from docx import Document
        doc = Document(file_path)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        full_text = "\n".join(paragraphs)
        return clean_text(full_text)
    except Exception as e:
        logger.error("DOCX extraction failed", error=str(e))
        raise ValueError(f"Could not extract text from DOCX: {e}")


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Extract text from file bytes based on extension."""
    suffix = Path(filename).suffix.lower()

    # Write to temp file
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if suffix == ".pdf":
            return extract_text_from_pdf(tmp_path)
        elif suffix in (".docx", ".doc"):
            return extract_text_from_docx(tmp_path)
        elif suffix == ".txt":
            return clean_text(file_bytes.decode("utf-8", errors="ignore"))
        else:
            raise ValueError(f"Unsupported file type: {suffix}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def clean_text(text: str) -> str:
    """Clean and normalize extracted text."""
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    # Remove weird characters
    text = re.sub(r'[^\x00-\x7F\u00C0-\u017F\u0180-\u024F]+', ' ', text)
    # Fix common OCR artifacts
    text = re.sub(r'(\w)-\n(\w)', r'\1\2', text)  # rejoin hyphenated words
    return text.strip()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks for vector embedding."""
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap

    return [c for c in chunks if len(c.strip()) > 50]
