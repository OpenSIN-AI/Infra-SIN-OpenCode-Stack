---
name: doctor
description: Universal repo health auditor. Multi-lens deep scan: documentation truthfulness, code quality, cross-repo consistency, config drift, security gaps, and methodological correctness. Produces P0/P1/P2 findings with file:line evidence. Works on ANY repo or multi-repo workspace.
license: MIT
compatibility: opencode
metadata:
  audience: all-agents
  workflow: universal-repo-health-audit
  trigger: doctor, audit, gesund, reinigen, health-check, diagnose, prüfe, check docs, sauber machen
---

# /doctor — Universal Repo Health Auditor

> Universell. Für JEDES Repo. 7 Lenses. P0/P1/P2. Quick + Deep.

```
/doctor           → Quick-Scan (Key-Files, ~15s)
/doctor deep      → Deep-Scan (ALL files, ~60s)
/doctor --fix     → Auto-Fix sicherer Probleme
/doctor --lens method_check,docs_complete
```

---

## Phase 0: Discovery

**Workspace erkennen:** `.opencode/workspace.yaml` vorhanden? → Multi-Repo-Audit aller `repos[].path`. Sonst Single-Repo.

**Repo-Typ:** Sprache erkennen (Python/JS/TS/Rust/Go/Swift), Typ (App/CLI/Lib/Config), Status (aktiv/archiviert).

---

## Phase 1: Diagnose — 7 Lenses

### 🔍 Lens 1: Documentation Truthfulness
**Frage:** Behaupten Docs Dinge, die der Code nicht hält?

Extrahiere ALLE technischen Claims aus `.md`-Dateien und vergleiche mit Source-Code:
- README claims vs actual CLI flags / API signatures
- Architecture docs vs actual file structure
- brain.md mechanism claims vs source code
- Version numbers consistency
- Dependency versions in docs vs package.json/pyproject.toml

**P0:** README nennt Flag das nicht existiert, API-Signatur falsch, Mechanismus-Lüge
**P1:** Veraltete Version, falscher Dateiname, inkorrekte Dependency

### 🔍 Lens 2: Methodological Correctness
**Frage:** Sind die beschriebenen Methoden technisch korrekt?

Existieren die genannten APIs/Funktionen/Flags? Werden tote Technologien empfohlen?

**Universelle Patterns (ständig erweiterbar):**
- `CGEventPostToPid` → `AXUIElementPerformAction` (Chrome 148 ignoriert) — **P0**
- `cua-driver` → `skylight-cli` (archiviert) — **P1**
- `--force-renderer-accessibility` → VoiceOver-Trick (crasht Chrome) — **P1**
- `SkyLight.framework` als aktiv → Accessibility API (macOS 26 locked) — **P1**

### 🔍 Lens 3: Cross-Repo Consistency
**Frage:** Sind alle Repos im Workspace konsistent?

- Gleiche LICENSE in allen Repos?
- workspace.yaml in jedem Repo?
- AGENTS.md Cross-Referenzen vorhanden?
- Konsistente Tool-Versionen?
- brain.md/goal.md in allen aktiven Repos?

### 🔍 Lens 4: Documentation Completeness
**Frage:** Fehlen kritische Dateien?

| Datei | Pflicht | Prüfung |
|-------|---------|---------|
| README.md | ✅ | Existiert, hat Install + Usage |
| LICENSE | ✅ | Existiert |
| AGENTS.md | ✅ | Hat Commands / Click-Contract |
| brain.md | ✅ | Aktueller State + Issues |
| .opencode/workspace.yaml | ✅¹ | Partner-Repos gelistet |
| CONTRIBUTING.md | 🟡 | Existiert |
| SECURITY.md | 🟡 | Existiert |
| banned.md | 🟡 | Verbotene Patterns |
| goal.md | 🟡 | Ziel + Status |
| fix.md | 🟡 | Bekannte Bugs |
| issues.md | 🟡 | Offene Punkte |

¹ Pflicht nur in Multi-Repo-Workspaces

### 🔍 Lens 5: Code Quality Surface
- package.json/pyproject.toml/Cargo.toml?
- Test-Framework + Linter + Formatter?
- CI/CD Workflow (.github/workflows/)?
- .gitignore: keine .env, node_modules, __pycache__, .venv?
- Type-Hints / TypeScript strict mode?

### 🔍 Lens 6: Secrets & Config Hygiene
- **P0:** `.env` mit echten Keys im Repo
- **P1:** `.env.example` fehlt
- **P1:** Hartcodierte API-Keys in Source
- **P2:** Passwörter in Config-Dateien

### 🔍 Lens 7: Repository Metadata
- Description + Topics gesetzt?
- Default Branch = main?
- Issues + PRs aktiviert?

---

## Phase 2: Diagnose-Report

```markdown
# 🩺 Doctor Audit — REPO_NAME
**Score: 85/100 (B+)** | Mode: deep | Lenses: 7/7

## 🔴 P0 — Critical
| # | Lens | File:Line | Finding |
|---|------|-----------|---------|

## 🟡 P1 — High
| # | Lens | File:Line | Finding |
|---|------|-----------|---------|

## 🟢 P2 — Medium
| # | Lens | File:Line | Finding |
|---|------|-----------|---------|

## 📊 Lens Scores
| Lens | Score | P0 | P1 | P2 |
|------|-------|----|----|-----|
| docs_vs_code | 75 | 2 | 3 | 0 |
| method_check | 60 | 5 | 0 | 0 |
| cross_repo | 90 | 0 | 1 | 0 |
| docs_complete | 85 | 0 | 0 | 2 |
| code_surface | 80 | 0 | 1 | 0 |
| config_hygiene | 95 | 0 | 0 | 0 |
| repo_meta | 70 | 0 | 0 | 3 |
```

---

## Phase 3: Behandlung (`--fix`)

**Automatisch (sicher):**
- Veraltete Claims ersetzen (CGEventPostToPid → AXPress)
- workspace.yaml in Repos ohne erstellen
- Cross-Referenzen in AGENTS.md
- ⚠️ HISTORICAL-Header in archivierte Docs
- .gitignore ergänzen

**Semi-Automatisch (Review):**
- brain.md updaten
- README API-Referenzen korrigieren
- Versionen synchronisieren

**Nur Meldung (manuell):**
- Lizenz-Konflikte
- Architektur-Änderungen

---

## Phase 4: Nachsorge

- Final Audit: Score muss gestiegen sein
- Commit: `docs: doctor-audit — GEFIXTES`
- Health-Trend: `.opencode/doctor-history.json`
