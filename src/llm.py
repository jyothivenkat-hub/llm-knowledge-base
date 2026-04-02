"""Claude API wrapper with prompt template support."""

from __future__ import annotations

import time
import logging
from pathlib import Path
from typing import Optional

import anthropic
from jinja2 import Environment, FileSystemLoader

from .config import Config

logger = logging.getLogger(__name__)


class LLM:
    def __init__(self, config: Config):
        self.config = config
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        self.model = config.model
        self.max_tokens = config.max_tokens

        prompts_dir = config.prompts_path
        if prompts_dir.exists():
            self.jinja_env = Environment(
                loader=FileSystemLoader(str(prompts_dir)),
                keep_trailing_newline=True,
            )
        else:
            self.jinja_env = None

        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def call(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        template: Optional[str] = None,
        template_vars: Optional[dict] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 0.3,
    ) -> str:
        """Call Claude with a prompt string or a rendered template.

        Args:
            prompt: Direct prompt text, OR ignored if template is provided.
            system: Optional system prompt.
            template: Name of a .md template file in templates/prompts/.
            template_vars: Variables to render the template with.
            max_tokens: Override default max_tokens.
            temperature: Sampling temperature.

        Returns:
            The assistant's text response.
        """
        if template and self.jinja_env:
            tmpl = self.jinja_env.get_template(template)
            prompt = tmpl.render(**(template_vars or {}))

        messages = [{"role": "user", "content": prompt}]

        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens or self.max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system

        response = self._call_with_retry(**kwargs)

        self.total_input_tokens += response.usage.input_tokens
        self.total_output_tokens += response.usage.output_tokens
        logger.debug(
            "Tokens: in=%d out=%d (total: in=%d out=%d)",
            response.usage.input_tokens,
            response.usage.output_tokens,
            self.total_input_tokens,
            self.total_output_tokens,
        )

        return response.content[0].text

    def _call_with_retry(self, max_retries: int = 3, **kwargs) -> anthropic.types.Message:
        """Call API with exponential backoff on rate limit errors."""
        for attempt in range(max_retries):
            try:
                return self.client.messages.create(**kwargs)
            except anthropic.RateLimitError:
                if attempt == max_retries - 1:
                    raise
                wait = 2 ** (attempt + 1)
                logger.warning("Rate limited, waiting %ds...", wait)
                time.sleep(wait)
            except anthropic.APIStatusError as e:
                if e.status_code == 529 and attempt < max_retries - 1:
                    wait = 2 ** (attempt + 1)
                    logger.warning("API overloaded, waiting %ds...", wait)
                    time.sleep(wait)
                else:
                    raise

    def token_usage_summary(self) -> str:
        """Return a summary of token usage."""
        return (
            f"Token usage: {self.total_input_tokens:,} input, "
            f"{self.total_output_tokens:,} output"
        )
