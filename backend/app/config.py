"""Configuration loader for MuleTrace."""

from pathlib import Path
from typing import Any

import yaml


def load_config(path: str | Path = "config.yaml") -> dict[str, Any]:
    """Load configuration from a YAML file.

    Args:
        path: Path to the YAML config file.

    Returns:
        Parsed configuration dictionary.

    Raises:
        FileNotFoundError: If the config file does not exist.
    """
    config_path = Path(path)
    if not config_path.exists():
        repo_root_config = Path(__file__).resolve().parent.parent.parent / "config.yaml"
        if repo_root_config.exists():
            config_path = repo_root_config
        else:
            raise FileNotFoundError(f"Config file not found: {config_path}")
    with open(config_path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_section(config: dict[str, Any], *keys: str, default: Any = None) -> Any:
    """Safely traverse nested config keys.

    Args:
        config: The root configuration dictionary.
        *keys: Sequence of keys to traverse.
        default: Value returned when any key is missing.

    Returns:
        The value at the nested key path, or *default*.
    """
    node = config
    for k in keys:
        if not isinstance(node, dict):
            return default
        node = node.get(k, default)
        if node is default:
            return default
    return node
