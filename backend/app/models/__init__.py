"""SQLAlchemy models package with compatibility exports for the original API."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys

from .models import *

_legacy_path = Path(__file__).resolve().parent.parent / "models.py"
_legacy_spec = spec_from_file_location("app._legacy_models", _legacy_path)
if _legacy_spec is None or _legacy_spec.loader is None:
	raise ImportError(f"Unable to load legacy models from {_legacy_path}")

_legacy_module = module_from_spec(_legacy_spec)
sys.modules[_legacy_spec.name] = _legacy_module
_legacy_spec.loader.exec_module(_legacy_module)
LegacyBase = _legacy_module.Base

# Keep legacy-only tables visible to callers that create the package Base metadata.
for _table_name, _table in LegacyBase.metadata.tables.items():
	if _table_name not in Base.metadata.tables:
		_table.to_metadata(Base.metadata)

for _name, _value in vars(_legacy_module).items():
	if not _name.startswith("_") and _name not in globals():
		globals()[_name] = _value

LegacyAccountResult = _legacy_module.AccountResult

del _legacy_module, _legacy_spec, _legacy_path, _name, _value, sys
