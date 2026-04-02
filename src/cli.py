"""CLI entry point for the knowledge base."""

import logging
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from .config import load_config

console = Console()


def setup_logging(verbose: bool):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )


@click.group()
@click.option("--config", "config_path", default=None, help="Path to config.yaml")
@click.option("--verbose", is_flag=True, help="Enable debug logging")
@click.pass_context
def cli(ctx, config_path, verbose):
    """LLM Knowledge Base - compile, search, and query your wiki."""
    setup_logging(verbose)
    ctx.ensure_object(dict)
    try:
        ctx.obj["config"] = load_config(config_path)
    except FileNotFoundError as e:
        console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.pass_context
def status(ctx):
    """Show knowledge base stats."""
    cfg = ctx.obj["config"]

    raw_files = list(cfg.raw_path.rglob("*"))
    raw_files = [f for f in raw_files if f.is_file() and not f.name.startswith("_")]
    wiki_files = list(cfg.wiki_path.rglob("*.md"))
    wiki_files = [f for f in wiki_files if not f.name.startswith("_")]
    output_files = list(cfg.output_path.rglob("*"))
    output_files = [f for f in output_files if f.is_file()]

    concepts = list((cfg.wiki_path / "concepts").rglob("*.md")) if (cfg.wiki_path / "concepts").exists() else []
    topics = [d for d in (cfg.wiki_path / "topics").iterdir() if d.is_dir()] if (cfg.wiki_path / "topics").exists() else []

    total_words = 0
    for f in wiki_files:
        total_words += len(f.read_text(encoding="utf-8").split())

    table = Table(title="Knowledge Base Status")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Vault", str(cfg.vault_path))
    table.add_row("Raw sources", str(len(raw_files)))
    table.add_row("Wiki articles", str(len(wiki_files)))
    table.add_row("Concepts", str(len(concepts)))
    table.add_row("Topics", str(len(topics)))
    table.add_row("Wiki words", f"{total_words:,}")
    table.add_row("Outputs", str(len(output_files)))
    table.add_row("Model", cfg.model)
    table.add_row("API key set", "Yes" if cfg.anthropic_api_key else "[red]No[/red]")

    console.print(table)


@cli.command()
@click.option("--file", "file_path", default=None, help="Ingest a specific file")
@click.pass_context
def ingest(ctx, file_path):
    """Scan raw/ for new files and update manifest."""
    from .ingest.ingest import run_ingest

    cfg = ctx.obj["config"]
    stats = run_ingest(cfg, file_path=file_path)
    console.print(f"[green]Ingest complete:[/green] {stats['new']} new, {stats['modified']} modified, {stats['unchanged']} unchanged")


@cli.command()
@click.option("--full", is_flag=True, help="Force full recompilation")
@click.pass_context
def compile(ctx, full):
    """Compile raw sources into the wiki."""
    from .compiler.compiler import run_compile

    cfg = ctx.obj["config"]
    stats = run_compile(cfg, full=full)
    console.print(f"[green]Compilation complete:[/green] {stats['summarized']} summarized, {stats['concepts']} concepts, {stats['topics']} topics")


@cli.command()
@click.argument("question")
@click.option("--save", is_flag=True, help="Save answer to output/answers/")
@click.pass_context
def qa(ctx, question, save):
    """Ask a question against the wiki."""
    from .qa.qa import run_qa

    cfg = ctx.obj["config"]
    answer = run_qa(cfg, question, save=save)
    console.print()
    console.print(answer)


@cli.command()
@click.argument("query", required=False)
@click.option("--serve", is_flag=True, help="Start web search UI")
@click.option("--rebuild", is_flag=True, help="Rebuild search index")
@click.pass_context
def search(ctx, query, serve, rebuild):
    """Search the wiki or start the web UI."""
    from .search.engine import SearchEngine

    cfg = ctx.obj["config"]
    engine = SearchEngine(cfg)

    if rebuild:
        engine.rebuild_index()
        console.print("[green]Search index rebuilt.[/green]")
        return

    if serve:
        from .search.web import create_app
        app = create_app(cfg)
        console.print(f"[green]Search UI at http://localhost:{cfg.search_web_port}[/green]")
        app.run(port=cfg.search_web_port, debug=False)
        return

    if not query:
        console.print("[yellow]Provide a query or use --serve for web UI.[/yellow]")
        return

    results = engine.search(query)
    if not results:
        console.print("[yellow]No results found.[/yellow]")
        return

    for i, r in enumerate(results, 1):
        console.print(f"[cyan]{i}.[/cyan] [bold]{r['title']}[/bold] (score: {r['score']:.2f})")
        console.print(f"   {r['path']}")
        console.print(f"   {r['snippet']}")
        console.print()


@cli.command()
@click.argument("format", type=click.Choice(["slides", "chart"]))
@click.argument("file_path")
@click.pass_context
def render(ctx, format, file_path):
    """Render a wiki article as slides or chart."""
    cfg = ctx.obj["config"]

    if format == "slides":
        from .render.slides import render_slides
        output = render_slides(cfg, Path(file_path))
        console.print(f"[green]Slides saved to:[/green] {output}")
    elif format == "chart":
        from .render.charts import render_chart
        output = render_chart(cfg, Path(file_path))
        console.print(f"[green]Chart saved to:[/green] {output}")


@cli.command()
@click.option("--check", "check_name", default=None, help="Run specific check")
@click.pass_context
def lint(ctx, check_name):
    """Run health checks on the wiki."""
    from .lint.health import run_lint

    cfg = ctx.obj["config"]
    report = run_lint(cfg, check_name=check_name)
    console.print(report)


@cli.command(name="file")
@click.argument("output_path")
@click.pass_context
def file_output(ctx, output_path):
    """Move an output file back into raw/ for recompilation."""
    import shutil
    cfg = ctx.obj["config"]
    src = Path(output_path)
    if not src.exists():
        src = cfg.output_path / output_path
    if not src.exists():
        console.print(f"[red]File not found:[/red] {output_path}")
        return
    dest = cfg.raw_path / "articles" / src.name
    shutil.copy2(src, dest)
    console.print(f"[green]Filed:[/green] {src.name} -> raw/articles/")
    console.print("Run [cyan]kb ingest[/cyan] then [cyan]kb compile[/cyan] to integrate.")
