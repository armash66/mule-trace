"""PII masking and reveal-on-demand with audit trail."""
from __future__ import annotations

import hashlib
import re


def mask_account_id(account_id: str) -> str:
    """Mask account ID showing only last 4 characters.
    
    Example: ACC-1234567890 → ACC-****7890
    """
    if not account_id or len(account_id) <= 4:
        return account_id
    
    # Find prefix (e.g., "ACC-")
    prefix_match = re.match(r'^([A-Za-z]+-)', account_id)
    if prefix_match:
        prefix = prefix_match.group(1)
        rest = account_id[len(prefix):]
        if len(rest) <= 4:
            return account_id
        return f"{prefix}{'*' * (len(rest) - 4)}{rest[-4:]}"
    
    # No prefix
    return f"{'*' * (len(account_id) - 4)}{account_id[-4:]}"


def mask_ip_address(ip: str) -> str:
    """Mask IP address showing only last octet.
    
    Example: 192.168.1.42 → ***.***.***.42
    """
    if not ip:
        return ip
    parts = ip.split(".")
    if len(parts) == 4:
        return f"***.***.***. {parts[3]}"
    return "***"


def mask_device_id(device_id: str) -> str:
    """Mask device ID showing only last 4 characters.
    
    Example: D-ABC123XYZ → D-*****3XYZ
    """
    return mask_account_id(device_id)  # Same logic


def hash_kyc_attribute(value: str, salt: str = "muletrace") -> str:
    """Hash a KYC attribute (PAN, phone, address) with salt.
    
    Used at ingest time — only hashes stored in DB, never raw values.
    """
    if not value:
        return ""
    salted = f"{salt}:{value.strip().lower()}"
    return hashlib.sha256(salted.encode("utf-8")).hexdigest()[:16]


def sanitize_for_log(text: str) -> str:
    """Remove potential PII from log messages."""
    # Mask anything that looks like an account number
    text = re.sub(r'ACC-\w{4,}', lambda m: mask_account_id(m.group()), text)
    # Mask IP addresses
    text = re.sub(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', lambda m: mask_ip_address(m.group()), text)
    # Mask 10-digit phone numbers
    text = re.sub(r'\b\d{10}\b', '****', text)
    # Mask PAN-like patterns
    text = re.sub(r'\b[A-Z]{5}\d{4}[A-Z]\b', '****', text)
    return text


def sanitize_csv_cell(value: str) -> str:
    """Prevent CSV/Excel formula injection on export.
    
    Prefix cells starting with = + - @ with a single quote.
    """
    if isinstance(value, str) and value and value[0] in ('=', '+', '-', '@'):
        return f"'{value}"
    return value
