# Stealth-Orchestrator Agent (A2A-Stealth-Orchestrator)

## 🎯 Purpose

**Autonome Survey-Automation mit KI-Vision via NVIDIA Nemotron 3 Nano Omni.**
Orchestriert Google Login → Umfrage-Teilnahme → EUR-Verdienst.
100% skylight-cli – keine Mausbewegung, kein Nutzer-Chrome.

## ⚠️ NICHT VERGESSEN (2026-05-01)

- **AKTIVES MODELL**: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (NICHT llama-3.2-11b-vision!)
- **AKTIVER CODE**: `~/dev/stealth-runner/runner/live_eye.py` + `~/dev/stealth-runner/runner/live_omni_monitor.py`
- **ARCHIVIERT**: `A2A-SIN-Worker-heypiggy` (BRAIN.md sagt "ARCHIVIERT")
- **VERALTET**: `mcp_survey_runner.py` (nutzt Mistral, nicht Nemotron)

## 🏗️ Architektur

```
┌──────────────────────────────────────────────────────────────┐
│                    STEALTH QUAD                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  playstealth launch ──→ isolierte Chrome-Instanz             │
│       │              (eigene PID, eigener Cache)             │
│       ▼                                                      │
│  LiveEye / LiveOmniMonitor ──→ Capture → Vision → Execute   │
│       │              ├─ Screenshot (schnell, 1-2 FPS)       │
│       │              ├─ Rolling Video (temporal, Conv3D)    │
│       │              └─ SSE Streaming (tokenweise)           │
│       ▼                                                      │
│  NVIDIA NIM ──→ nvidia/nemotron-3-nano-omni-30b-a3b         │
│       │         POST https://integrate.api.nvidia.com/v1/    │
│       ▼                                                      │
│  skylight-cli ──→ AXPress, --element-index                   │
│                  KEINE Mausbewegung                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 🔗 Stealth-Quad (7 Repos)

| Layer               | Repo                                                    | Technologie                        |
| ------------------- | ------------------------------------------------------- | ---------------------------------- |
| **🧠 Orchestrator** | [stealth-runner](https://github.com/OpenSIN-AI/stealth-runner) | Python, State Machine, Omni Vision |
| **🎭 HIDE**         | [playstealth-cli](https://github.com/SIN-CLIs/playstealth-cli) | Python, Playwright, Fingerprint    |
| **🖱️ ACT**          | [skylight-cli](https://github.com/SIN-CLIs/skylight-cli) | Swift, AXUIElementPerformAction    |
| **👁️ SENSE**        | [unmask-cli](https://github.com/SIN-CLIs/unmask-cli)     | TypeScript, CDP, JSON-RPC          |
| **📹 VERIFY**       | [screen-follow](https://github.com/SIN-CLIs/screen-follow) | Swift, ScreenCaptureKit, MP4       |
| **🤖 Vision**       | NVIDIA NIM Nemotron Omni                                 | 30B-A3B MoE, Conv3D, Video+Audio   |
| **📊 Graph**        | [Graphify](https://github.com/safishamsi/graphify)       | 6 Repos merged → 4820 Nodes        |

## 🧠 Vision Model

```yaml
model: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
api: POST https://integrate.api.nvidia.com/v1/chat/completions
auth: Authorization: Bearer $NVIDIA_API_KEY
streaming: SSE (stream: true + Accept: text/event-stream)
antwortfeld: msg.get("reasoning") or msg.get("content")
features: Video+Audio+Bild+Text in EINEM Call, Conv3D, 256K Kontext
```

### Optimierungen v6 (2026-05-01)

| Optimierung | Datei | Impact |
|-------------|-------|--------|
| PNG → JPEG quality=50 | `live_eye.py` Zeile 50-51 | ~80% weniger Payload |
| PNG → JPEG quality=50 | `live_omni_monitor.py` Zeile 116-125 | ~80% weniger Payload |
| SSE Streaming | `live_eye.py` analyze() | Erster Token <1s statt 15s+ |
| JSON-enforced Prompt | `live_eye.py` analyze() | Strukturierte Antwort statt Prosa |

## 🚀 Quick Start

```bash
# 1. Chrome starten (isoliert)
playstealth launch --url 'https://heypiggy.com/?page=dashboard'

# 2. Google Login
bash cli/heypiggy-login <PID>

# 3a. LiveEye starten (Memory-Ringbuffer + Omni Video)
python3 runner/live_eye.py <PID>

# 3b. Oder LiveOmniMonitor (Hybrid Screenshot + Video)
python3 -c "
from runner.live_omni_monitor import LiveOmniMonitor
m = LiveOmniMonitor(fps=1.0, debug=True)
m.start('https://heypiggy.com/?page=dashboard')
m.run_continuous(max_steps=100)
"

# 4. Schritt-Orchestrator
python3 runner/step.py "https://heypiggy.com/?page=dashboard"
```

## 🛡️ Golden Rules

1. **NUR `skylight-cli`** – NIE skylight-cli
2. **NUR `--element-index`** – NIE `--x`/`--y` Koordinaten
3. **NUR `playstealth launch`** – NIE direktes Chrome öffnen
4. **NUR NVIDIA NIM httpx** – NIE openai-Client
5. **JEDER Schritt durch Vision** – Kein DOM-Prescan
6. **Modell: Nemotron Omni** – NIE llama-3.2-11b-vision

## 🔧 Technische Details

### LiveEye v6 (`runner/live_eye.py`)
- **Capture**: mss (3ms pro Frame, 5 FPS)
- **Ringbuffer**: 20 Frames (4 Sekunden), KEIN Disk I/O
- **Video**: PyAV encode → MP4 (960x540, CRF 35, ultrafast)
- **API**: httpx SSE Streaming → NVIDIA NIM (first token <1s)
- **Format**: JPEG quality=50 (80% weniger Payload)
- **Prompt**: JSON-enforced Output ONLY JSON

### LiveOmniMonitor (`runner/live_omni_monitor.py`)
- **Hybrid**: Screenshot (schnell, jeder Step) + Rolling Video (alle 5 Steps)
- **Streaming**: SSE tokenweise Antwort
- **Execute**: skylight-cli click/type per element-index
- **Frame**: skylight-cli screenshot → PNG → JPEG quality=50
- **Video**: screen-follow record → ffmpeg -sseof extraktion

## 📁 Dateien

| Datei | Zweck |
|-------|-------|
| `runner/live_eye.py` | LiveEye v6 – Memory-Ringbuffer + Omni Video |
| `runner/live_omni_monitor.py` | Hybrid Screenshot + Rolling Video + SSE |
| `runner/nemotron_omni.py` | OmniClient – Video/Audio/Bild/Text |
| `runner/video_analyzer.py` | CLI-Tool für Screen-Follow-Analyse |
| `runner/step.py` | Ein-Schritt-Orchestrator mit Multi-Frame |
| `runner/state_machine.py` | State-Machine Omni-integriert |
| `runner/stealth_executor.py` | Executor mit hold/drag/verify |
| `config/vision_models.yaml` | Modell-Konfiguration |
| `AGENTS.md` | Vollständige Agenten-Anleitung |
| `brain.md` | Systemwissen & Architektur |

## 🔗 Integration

Dieser Agent ist Teil des OpenSIN-Ökosystems und wird via `infra-opencode-stack` + `sin-sync` auf alle Maschinen verteilt (Mac, OCI VM, HF VMs).
