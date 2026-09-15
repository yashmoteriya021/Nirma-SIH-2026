"""Test-wide fixtures: keep the suite offline and deterministic."""

import os

import pytest


@pytest.fixture(autouse=True)
def _offline_llm(monkeypatch):
    """Never hit a real LLM from tests, even if the developer's shell has keys set."""
    monkeypatch.setenv("LLM_PROVIDER", "none")
    for var in ("OPENAI_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "LLM_API_KEY"):
        monkeypatch.delenv(var, raising=False)
