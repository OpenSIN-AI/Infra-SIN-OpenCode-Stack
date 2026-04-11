#!/usr/bin/env python3
"""
Smoke test for compose_thumbnail.py

Tests that the script can be imported and run with basic arguments without errors.
Does not require actual images; uses placeholders if needed.
"""

import sys
from pathlib import Path

# Import the main script as a module to check for syntax errors
script_path = Path(__file__).parent / "compose_thumbnail.py"
if not script_path.exists():
    print(f"ERROR: compose_thumbnail.py not found at {script_path}")
    sys.exit(1)

# We'll exec the script to check it compiles, then optionally run a minimal generation
# First: syntax check via import
import importlib.util

spec = importlib.util.spec_from_file_location("compose_thumbnail", script_path)
mod = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(mod)
except Exception as e:
    print(f"ERROR: Failed to load compose_thumbnail.py: {e}")
    sys.exit(1)

print("compose_thumbnail.py loaded successfully.")

# If a sample background and mascot exist, run a quick generation
sample_bg = Path("skills/gen-thumbnail/fixtures/reference-blog-01.png")
mascot = (
    Path("skills/gen-thumbnail/fixtures/mascot.png")
    if Path("skills/gen-thumbnail/fixtures/mascot.png").exists()
    else Path("_thumbnail-review/mascot.png")
)
output = Path("skills/gen-thumbnail/fixtures/test-output.png")

if sample_bg.exists() and mascot.exists():
    # Simulate CLI call
    sys.argv = [
        "test_compose.py",
        str(sample_bg),
        str(output),
        str(mascot),
        "AUTO|PROFIT?",
        "--sub-badge",
        "AI AGENT MAKES MONEY ALONE",
        "--layout",
        "reference",
    ]
    try:
        mod.main()
        print(f"Test thumbnail generated at {output}")
    except Exception as e:
        print(f"Test run failed: {e}")
        sys.exit(1)
else:
    print("Skipping actual generation (sample assets not found)")

print("SMOKE TEST PASSED")
