"""Vercel serverless entry point for the dashboard."""

import sys
from pathlib import Path

# Add project root to path
root = Path(__file__).parent.parent
sys.path.insert(0, str(root))

from src.dashboard.app import create_app
from src.config import load_config

config = load_config(root / "config.yaml")
app = create_app(config)
