# Code-Swarm: SOTA Agent Swarm Architecture with Simone-MCP

> **KEIN tmux! KEINE Worktrees! KEIN Background-Dispatch!**
> Subagent-Delegation erfolgt NUR via opencode-native oh-my-opencode Sub-Sessions.

## Simone-MCP Integration

**Source**: https://github.com/Delqhi/Simone-MCP

Every Code-Swarm agent uses **Simone-MCP** for AST-level code operations via MCP 2.0 protocol.

### Simone-MCP Tools

| Tool | Type | Description |
|:---|:---|:---|
| `code.find_symbol` | Read | Locate symbol definitions across workspace |
| `code.find_references` | Read | Find textual references to a symbol |
| `code.replace_symbol_body` | Write | Replace the body of a Python function |
| `code.insert_after_symbol` | Write | Insert text immediately after a symbol block |
| `code.project_overview` | Read | Summarize workspace footprint and file types |

### Integration

```python
from simone_mcp.client import SimoneClient
from simone_mcp.bridge import SwarmSimoneBridge

bridge = SwarmSimoneBridge("http://localhost:8234")
await bridge.analyze_code("MyClass")
```

## SOTA Implementation

### P0 - Production Critical
- [x] **Data Persistence**: PostgreSQL schema + Redis cache + S3 storage + pgvector
- [x] **Monitoring**: Prometheus metrics + OpenTelemetry tracing + Health checks
- [x] **Security**: OAuth2/JWT auth + RBAC permissions + bcrypt
- [x] **Testing**: Unit tests + Integration tests + Load tests (Locust)

### P1 - High Value
- [x] **API Gateway**: FastAPI REST + OpenAPI/Swagger + Rate limiting
- [x] **Kubernetes**: Helm chart + HPA auto-scaling + Istio
- [x] **WebSockets**: Real-time agent status + Live task updates
- [x] **CLI**: Rich output + Progress bars + Typer
- [x] **Documentation**: MkDocs + Swagger

### P2 - Optimization
- [x] **Self-Improvement**: RLHF feedback loops + Bayesian optimization

## Quick Start

```bash
# Clone and install
gh repo clone OpenSIN-Code/Code-Swarm
cd Code-Swarm
pip install -r requirements.txt

# Copy configs to opencode
cp configs/opencode.json ~/.config/opencode/opencode.json
cp configs/oh-my-opencode.json ~/.config/opencode/oh-my-opencode.json

# Run tests
pytest tests/unit/

# Start API server
uvicorn api.main:app --reload

# CLI commands
python -m cli.main status
```

## Architecture

```
SIN-Zeus (Fleet Commander)
├── hermes (Dispatcher) → Simone-MCP AST
├── prometheus (System Planner) → Fireworks AI minimax-m2.7 + Simone-MCP
├── zeus (Validation Superlayer) → Fireworks AI minimax-m2.7
├── atlas (Backend Engineer) → Fireworks AI minimax-m2.7 + Simone-MCP
├── multimedia_looker (Vision) → NVIDIA Nemotron 3 Nano Omni
└── LangGraph Pipeline (StateGraph + Simone-MCP + Feedback Loops)
```

## GitHub Issues

| # | Status | Description |
|---|--------|-------------|
| #15 | 🚀 Epic | Simone-MCP Full Integration |
| #16 | 🔧 TODO | Deploy Simone-MCP on OCI VM |
| #17 | 🔗 TODO | Configure endpoint |
| #18 | 🧠 TODO | LangGraph integration |
| #19 | 💾 TODO | Hybrid memory |
| #20 | ⚙️ TODO | opencode.json MCP config |