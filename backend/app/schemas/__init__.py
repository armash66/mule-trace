"""Pydantic schemas package with compatibility exports for the original API."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys

from .schemas import *

_legacy_path = Path(__file__).resolve().parent.parent / "schemas.py"
_legacy_spec = spec_from_file_location("app._legacy_schemas", _legacy_path)
if _legacy_spec is None or _legacy_spec.loader is None:
	raise ImportError(f"Unable to load legacy schemas from {_legacy_path}")

_legacy_module = module_from_spec(_legacy_spec)
sys.modules[_legacy_spec.name] = _legacy_module
_legacy_spec.loader.exec_module(_legacy_module)

for _name, _value in vars(_legacy_module).items():
	if not _name.startswith("_") and _name not in globals():
		globals()[_name] = _value

LegacyFinding = _legacy_module.Finding
LegacyIngestResponse = _legacy_module.IngestResponse
LegacyNetworkEdge = _legacy_module.NetworkEdge
LegacyNetworkNode = _legacy_module.NetworkNode
LegacyNetworkResponse = _legacy_module.NetworkResponse
LegacyScoredAccount = _legacy_module.ScoredAccount

del _legacy_module, _legacy_spec, _legacy_path, _name, _value, sys
