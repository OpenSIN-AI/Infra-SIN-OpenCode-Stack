#!/usr/bin/env python3
"""
Split an oversized GLB into browser-friendly chunks plus a manifest.

Why this exists:
- some static hosts impose a hard per-file limit
- large ready-made GLBs are still usable if shipped as multiple parts
- the website can fetch the parts, concatenate them, and create a Blob URL

This script intentionally uses only the Python standard library.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class ChunkSpec:
    filename: str
    byte_length: int
    sha256: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Split a GLB into <25 MiB browser-loadable chunk files."
    )
    parser.add_argument(
        "input_glb",
        type=Path,
        help="Absolute or relative path to the source .glb file.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Directory that will receive the chunk files and manifest.",
    )
    parser.add_argument(
        "--base-name",
        default="mascot",
        help="Base filename used for manifest and chunk files. Default: mascot",
    )
    parser.add_argument(
        "--chunk-size-mib",
        type=int,
        default=24,
        help="Chunk size in MiB. Default: 24 (safe under common 25 MiB limits).",
    )
    return parser.parse_args()


def sha256_bytes(payload: bytes) -> str:
    import hashlib

    return hashlib.sha256(payload).hexdigest()


def split_payload(payload: bytes, chunk_size: int) -> list[bytes]:
    return [payload[i : i + chunk_size] for i in range(0, len(payload), chunk_size)]


def build_manifest(
    *,
    source_name: str,
    total_bytes: int,
    base_name: str,
    chunk_size: int,
    chunks: list[ChunkSpec],
) -> dict:
    return {
        "version": 1,
        "type": "glb-chunk-manifest",
        "sourceFile": source_name,
        "mimeType": "model/gltf-binary",
        "baseName": base_name,
        "totalBytes": total_bytes,
        "chunkBytes": chunk_size,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "parts": [
            {
                "filename": chunk.filename,
                "byteLength": chunk.byte_length,
                "sha256": chunk.sha256,
            }
            for chunk in chunks
        ],
    }


def main() -> int:
    args = parse_args()
    input_glb = args.input_glb.resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_glb.exists():
        raise SystemExit(f"Input GLB not found: {input_glb}")

    chunk_size = args.chunk_size_mib * 1024 * 1024
    payload = input_glb.read_bytes()
    parts = split_payload(payload, chunk_size)

    emitted_chunks: list[ChunkSpec] = []
    for index, part in enumerate(parts, start=1):
        filename = f"{args.base_name}.part{index:03d}.bin"
        (output_dir / filename).write_bytes(part)
        emitted_chunks.append(
            ChunkSpec(
                filename=filename,
                byte_length=len(part),
                sha256=sha256_bytes(part),
            )
        )

    manifest = build_manifest(
        source_name=input_glb.name,
        total_bytes=len(payload),
        base_name=args.base_name,
        chunk_size=chunk_size,
        chunks=emitted_chunks,
    )
    manifest_path = output_dir / f"{args.base_name}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Input:     {input_glb}")
    print(f"Output:    {output_dir}")
    print(f"Total:     {len(payload)} bytes")
    print(f"ChunkSize: {chunk_size} bytes")
    print(f"Chunks:    {len(emitted_chunks)}")
    print(f"Manifest:  {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
