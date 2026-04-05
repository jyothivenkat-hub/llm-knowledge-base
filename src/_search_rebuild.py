"""Helper to rebuild search index — avoids circular imports in compiler."""

from .config import Config
from .search.engine import SearchEngine

def rebuild_search_index(config: Config):
    engine = SearchEngine(config)
    engine.rebuild_index()
