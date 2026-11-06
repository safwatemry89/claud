# Prompt for the Claude + Revit MCP session: model a small villa and pilot the BIM Toolkit (v2)

Copy everything below the line into the Claude session that is connected to Revit through MCP.
Before you paste, replace the values in square brackets in section 0 and run the pre-flight in section P.

---

## P. Pre-flight (the person does this before pasting; the session cannot fix any of it)

The session must run **on the Windows machine that runs Revit**, as a local Claude Code or Cowork session. A cloud (claude.ai/code) session has no Revit, no pyRevit, no toolkit folder and cannot read `C:\`; pasting this prompt there produces no result.

| # | Check | Pass condition |
|---|---|---|
| P1 | Revit open, one empty project or no project | Help > About shows version and build |
| P2 | pyRevit loaded, `install\install.bat` run | **BIM Toolkit** tab visible |
| P3 | Revit MCP server registered in Claude | `claude mcp list` (or the app's connector list) shows the Revit server as connected; note its **name** |
| P4 | Toolkit folder exists | `[C:\Users\<user>\AppData\Roaming\BIMToolkit\0.14.1]\README.md` opens |
| P5 | Output folder exists and is empty | `[C:\BIM\villa_out]` |
| P6 | If a cloud session is used for reading reports only (route B) | Both folders above are in the Claude desktop app's Remote Control folder list and show as available to cloud sessions |

## Rules that override anything else
- Work only in the new villa file you create. Never open or touch any other model.
- Every toolkit run is **preview first** (`apply: false`, the default). Apply only on the villa model, only after the preview is reviewed, and only in the steps marked "then apply".
- Report facts. If a tool call fails, quote the error. Do not describe a result you did not observe. Do not edit the toolkit's own code; log the defect instead.
- Units are metric (millimetres in the model, metres in this brief).

## 0. First, report your capabilities (before modelling)

Answer these in one short list, then continue:
1. Revit version and build (Help > About), and whether the **BIM Toolkit** tab is visible in the ribbon.
2. The **name of the Revit MCP server** and its full tool list. Then state which tools give you (a) element creation and modification, (b) Python or C# execution inside Revit, (c) file reads from the Windows disk. Run one harmless read call (document title or active view name) and quote the result. If (a) is missing, stop: the villa cannot be modelled by you and must be modelled by the person before section 3 can run.
3. Toolkit folder: `[C:\Users\<user>\AppData\Roaming\BIMToolkit\0.14.1]`. Read `README.md` and `docs/PILOT_QUICK_START.md` now and confirm the module table matches section 3.2.
4. Output folder (empty, local): `[C:\BIM\villa_out]`
5. Survey grid EPSG: `[9358]` (KSA-GRF17 / UTM zone 38N; change if the demo site is elsewhere)

Route decision: route A if (b) is available, else route B (section 3.4). Say which route you are using and why.

## 1. Project set-up in Revit

1. New project from the **Structural** metric template (or the default metric template if no structural template exists). Save as `VILLA-DEMO-ZZ-ZZ-M3-S-000001.rvt` in the output folder. Not workshared.
2. Project Information: Project Name `Villa demo`, Project Number `VILLA-DEMO`, Client `Training`.
3. Levels (elevation in m, name exactly). Set **Building Story** as shown; this fixes the IFC storey count and the COBie Floor count in steps 13 and 14.

| Level | Elevation | Building Story | Use |
|---|---|---|---|
| Foundation | -1.50 | Yes | Top of footings |
| Level 00 | 0.00 | Yes | Ground floor FFL |
| Level 01 | +3.60 | Yes | First floor FFL |
| Roof | +7.20 | Yes | Roof slab |
| Parapet | +8.40 | **No** | Parapet top / tank slab |

4. Grids: letters along X (A, B, C, D at 0, 4.5, 9.0, 13.5 m), numbers along Y (1, 2, 3, 4 at 0, 5.0, 10.0, 15.0 m). Footprint 13.5 x 15.0 m to grid centrelines (about 200 m² per floor) on a 20 x 25 m plot; grid A1 is 3.0 m from the front and side plot lines.
5. Shared coordinates: set the Survey Point at **E 672 100.000, N 2 734 900.000, elevation 612.000 m**, Project Base Point at grid A1, True North = Project North (0°). On EPSG 9358 this is **24.719° N, 46.702° E** (south Riyadh); step 13 checks against it.
6. Create a 3D view named `IFC Export` and floor plans for every level (the toolkit's Create Views will add the rest).

## 2. Villa design brief (proposed design, for modelling only)

Design basis stated so the toolkit checks have something to check against. It is a concept with placeholder sizes; it is **not** an engineered design. No geotechnical report exists, so the bearing pressure below is assumed. Every report you write must carry the line: *"Allowable bearing 150 kPa is an assumption pending a geotechnical report."*

**Structure: RC frame, SBC 304 / ACI 318-19**
- Concrete C30 (fc' = 30 MPa) for all elements; reinforcement Grade 420 (fy = 420 MPa). Create these two materials and assign them (concrete to structural framing, columns, floors and foundations; steel to the rebar bar types).
- Assumed allowable bearing 150 kPa at -1.5 m.
- Isolated footings under every column, top at Foundation level, 0.5 m thick. Family: Footing-Rectangular. Mark `F-<grid>`, e.g. `F-A1`. Plan sizes are set so the placeholder is internally consistent with 150 kPa under an indicative service load (two suspended 200 mm slabs, 300 x 600 beams, 3 kPa superimposed dead, 2 kPa live):

| Column position | Count | Indicative service load | Footing |
|---|---|---|---|
| Interior (B2, B3, C2, C3) | 4 | ~550 kN | 2.0 x 2.0 m |
| Edge | 8 | ~310 kN | 1.8 x 1.8 m |
| Corner (A1, A4, D1, D4) | 4 | ~190 kN | 1.5 x 1.5 m |

- Ground beams 300 x 500 mm along all grid lines, hosted on Foundation level with a 900 mm offset (top of beam at -0.60 m). Mark `GB-<n>`.
- Columns 300 x 500 mm at all 16 grid intersections, split per storey: Foundation→Level 00 (1.5 m), Level 00→Level 01 (3.6 m), Level 01→Roof (3.6 m). Long side along Y. Family: Concrete-Rectangular-Column. Mark `C-<grid>`, e.g. `C-B2`.
- Beams 300 x 600 mm (drop beams, top of beam at level) along all grid lines at Level 01 and Roof. Family: Concrete-Rectangular Beam. Mark `B-<level>-<n>`.
- Slabs: solid flat slabs 200 mm at Level 01 and Roof, structural, **edges on grid lines A, D, 1 and 4** (13.5 x 15.0 m), with a 1.2 x 2.6 m stair opening between grids B–C / 2–3. Ground floor: 150 mm slab on grade at Level 00, same edges (non-structural floor is acceptable).
- Parapet: 200 mm block wall, 1.2 m high around the roof perimeter, base on Roof. Stair bulkhead 3.0 x 3.0 m over the stair opening: 200 mm block walls Roof to +10.20 m (Roof level, 3000 mm top offset) and a 150 mm slab hosted on Roof with a 3000 mm height offset. Water tank slab 2.4 x 2.4 x 0.15 m hosted on Roof over grids C–D / 3–4 with a 300 mm offset (on 300 mm block dwarf walls).
- Stair: two straight flights, 1.2 m wide, riser 170 mm, going 280 mm, Level 00 to Level 01 and Level 01 to Roof, in the opening above. If your MCP tools cannot create a Stairs element, ask the person to place it with the Stair tool and log "stair placed manually" in the report.

**Architecture (enough for rooms, doors, windows and the asset register)**
- External walls 200 mm concrete block on the grid lines, internal 150 mm block, base at the floor level, top constrained to the level above with a -600 mm offset (underside of beam). Plaster is not modelled.
- Ground floor rooms (name, approximate size): Entrance lobby 3 x 4; Men's majlis 4.5 x 6; Dining 4.5 x 5; Family living 4.5 x 6; Kitchen 4.5 x 4; Guest WC 1.5 x 2.5; Maid room 3 x 3; Maid WC 1.5 x 2; Store 2 x 2.5; Stair. (10 rooms)
- First floor rooms: Master bedroom 4.5 x 6; Master bathroom 2.5 x 3; Dressing 2 x 3; Bedroom 2 4.5 x 5; Bedroom 3 4.5 x 5; Shared bathroom 2.5 x 3; Family hall 4.5 x 6; Laundry 2 x 3; Stair. (9 rooms)
- Doors: main entrance 1.2 x 2.4 m; internal 0.9 x 2.1 m; bathrooms 0.8 x 2.1 m. Mark `D-<nn>`.
- Windows: 1.5 x 1.5 m, sill 0.9 m, one per habitable room per external wall; bathrooms 0.6 x 0.6 m, sill 1.8 m. Mark `W-<nn>`.
- Place a **Room** in every space with the names above: **19 rooms** in total (rooms are needed for COBie Space and the asset register).
- MEP for the handover tools, minimum: one split AC indoor unit (any mechanical equipment family) in each bedroom (3), the majlis and the family living (5 units); one water heater in each of the 4 bathrooms and WCs; one distribution board in the store. Give each a `Mark` (`AC-01`…`AC-05`, `WH-01`…`WH-04`, `DB-01`).

Deliberate defects to plant (the toolkit must find them; list element IDs in your report so we can verify):
1. Two identical windows placed in the same location (duplicate instance warning).
2. One column with an empty `Mark`.
3. One beam type whose name breaks the naming rule, e.g. type `beam 300x600 final v2`.
4. One extra AC unit (`AC-06`) with no Room assignment, placed 0.5 m outside the external wall.

## 3. What the BIM Toolkit is and how to use it

### 3.1 Shape
- `lib/` shared Python library; `modules/m01…m27` each expose `run(opts) -> dict`; `pyrevit/BIMToolkit.extension` is the ribbon; `config/` holds example rule files, rebar rules, rates, requirements; `docs/` holds `PILOT_QUICK_START.md` and `PILOT_TEST_PROTOCOL.md`. Read `README.md` first (module table with every option).
- Every module writes to the **output folder** (HTML report, CSV/XLSX, JSON) and returns a result dict with `status` (`OK` / `ISSUES` / `PREVIEW` / `BLOCKED` / `ERROR`) and tables.
- `apply` defaults to `false`. Preview changes nothing. Apply runs in one Revit transaction named `BIM Toolkit …` that Ctrl+Z undoes.

### 3.2 Ribbon map (tab **BIM Toolkit**)
| Panel | Buttons → module |
|---|---|
| Audit | Warnings (m01), Rule Check (m05), Health Score (m06) |
| Data | Parameters (m02), Families (m09), Excel Export / Excel Import (m18) |
| Docs | Create Views (m07), Create Sheets (m08) |
| Geo | Coordinates (m03), Google Earth 3D (m10), Set-out Export (m11) |
| Coordination | Clash Detect (m12, m13 proposals), MEP Check (m14) |
| Structure | Rebar (m15), BBS (m16) |
| Quantities | Take-off (m04), Dashboard (m17), Cost (m22) |
| Planning | 4D Link (m21) |
| Handover | MIDP Tracker (m26), IFC Export (m23), COBie (m24), Asset Register (m27) |
| Settings | Project Setup (m25), Project Settings, Output Folder, Edit Rules, Doctor (m19), Pilot Run (m20) |

### 3.3 Project Setup (do this once, before any other button)
Settings > Output Folder → the folder from section 0. Settings > Project Setup > **Create** writes `BIM_Toolkit_Project_Inputs.xlsx` there. Fill only:
- `General`: `project_name` = Villa demo, `epsg` = the value in section 0, `revit_version`, `meb_means_mep` = Yes.
- `Rebar settings` / `Rebar rules`: keep the examples (SBC304) but set `fc_mpa` = 30 and `fy_mpa` = 420 to match section 2. They are placeholders for an engineer's design.
- `Rates`: keep the examples (SAR demo rates).
- `MIDP`: add two rows: `VILLA-DEMO-ZZ-ZZ-M3-S-000001` (Model, milestone 30% Design, due today + 7, required status S2) and `VILLA-DEMO-ZZ-00-DR-S-000101` (GA plan Level 00, same milestone, S2).
- Everything else empty (the toolkit falls back to its standard and flags it).
Save, then Project Setup > **Import** > review the preview tables > Yes.

### 3.4 Two ways to run modules
- **Route A, code execution.** If your MCP can run Python inside Revit (pyRevit/IronPython 2.7 or CPython 3), run a module exactly like `dynamo/runner_stub.py` does:
  ```python
  import sys, json, importlib
  root = r"<toolkit folder>"
  for sub in ("lib", "modules"):
      sys.path.insert(0, root + "\\" + sub)
  import bim_core
  mod = importlib.import_module("m04_quantities")
  res = mod.run({"out_dir": r"<output folder>", "apply": False})
  print(json.dumps({k: v for k, v in res.items() if not k.endswith("table")}, indent=1))
  ```
  Running the modules from an MCP code executor has never been tested. It is itself part of the pilot. If `bim_core` cannot find the active document, quote the error and switch to route B. Note the Python flavour the executor gave you (IronPython 2.7 or CPython 3) in the report, since the modules may behave differently.
- **Route B, ribbon.** Ask the person to click the button, choose Preview, and tell you when it finishes. Then read the report in the output folder (`*.html`, `*.csv`, `*.json`) and the pyRevit output window text they paste.

### 3.5 Three rules for using it on real projects (teach these back in your report)
1. Preview, review, then apply. 2. Synchronise before apply on workshared models. 3. First runs on a detached copy, never the central model. (The villa is not workshared, so rule 2 does not apply here.)

## 4. Test sequence on the villa (in this order; stop and report at any ERROR)

| # | Step | Expected on the villa | Then apply? |
|---|---|---|---|
| 1 | Settings > Doctor | PASS for Revit version, toolkit folder, output folder, API members; WARN for shared parameter file not set; georeferencing PASS (survey point set) | – |
| 2 | Settings > Pilot Run | Every module preview, no ERROR, zip in `BIMToolkit_pilot\` | – |
| 3 | Data > Parameters | Preview lists BIM_Status, BIM_Suitability, BIM_ContainerID, BIM_Revision, BIM_AssetTag, BIM_ActivityId… to bind | **Yes** (set `shared_file` in Project Settings to `villa_shared.txt` in the output folder; the module creates it if missing) |
| 4 | Audit > Warnings | Finds the duplicate window (defect 1), marks it auto-fixable | **Yes** – the duplicate is deleted; confirm by Ctrl+Z then redo |
| 5 | Audit > Rule Check, Health Score | Fails: empty Mark on one column (defect 2), bad type name (defect 3); score and grade reported | – |
| 6 | Quantities > Take-off | Concrete volume per level and category. Hand figures below. State whether the toolkit reports gross or joined volumes; joined volumes are lower (column/beam and beam/slab overlaps are deducted once) and a shortfall of up to ~10% on columns and beams is expected, not a defect | – |
| 7 | Quantities > Cost | Total in SAR from demo rates; nothing "unpriced" for concrete | – |
| 8 | Geo > Coordinates, Set-out Export, Google Earth 3D | Easting/Northing for columns within 0–13.5 m E and 0–15 m N of E 672 100 / N 2 734 900 (grid A1 = survey point); CSV + DXF; KMZ opens in Google Earth at 24.72 N / 46.70 E | **Yes** for Coordinates (writes parameters) |
| 9 | Docs > Create Views, Create Sheets | Structural plans per level, sections on grids B and 2, sheets S-101… with title block | **Yes** |
| 10 | Structure > Rebar (SBC304) | Preview: columns 8 H16 (3 per face) + H10@150 ties, beams 3 H16 B + 2 H12 T + H10@150, footings H16@150; cover and ratio checks shown. **Expect a ratio WARN on the beam top steel**: 2 H12 = 226 mm² is below ACI 318-19 §9.6.1.2 minimum (≈540 mm² for 300 x 540) at continuous supports. If no warning appears, the ratio check is not evaluating top steel; log it. Then apply for **one column and one beam only** (`selection_ids`), confirm rebar appears | partial |
| 11 | Structure > BBS | Bar marks, shape codes, cut lengths rounded to 25 mm, weights (d²/162.2) for the two members above | – |
| 12 | Coordination > Clash Detect, MEP Check | Few or no clashes (no MEP services); MEP Check lists `AC-06` outside any room if it checks space assignment, otherwise state that it did not | – |
| 13 | Handover > IFC Export | IFC4 from view `IFC Export`; check report: counts match, no duplicate GlobalIds, **4 storeys** (Parapet is not a Building Story), site lat/long **24.72 N / 46.70 E** | – |
| 14 | Handover > COBie | Workbook: Floor sheet **4 rows** if it follows Building Story, 5 if it exports all levels (state which); **19 spaces**; components for 6 AC, 4 WH, 1 DB; validation lists missing Contact / Type data | – |
| 15 | Handover > Asset Register | AC units, water heaters and DB classified (standard AIR classes, flagged as not confirmed); new tags like `VILLA-DEMO-01-AC-001`; `AC-06` shows an empty space | **Yes** – tags written to BIM_AssetTag |
| 16 | Handover > MIDP Tracker | Model row IN PROGRESS / NOT STARTED (status empty), sheet row NOT STARTED, the toolkit-created sheets NOT IN MIDP; naming check passes for the model file name | – |
| 17 | Data > Excel Export, Excel Import | Export columns with Mark; change one Mark in Excel, change another Mark in Revit after the export; Import preview shows one WOULD SET and one CONFLICT | **Yes** |

**Hand figures for step 6 (gross geometry, to grid centrelines)**

| Item | Calculation | m³ |
|---|---|---|
| Columns, Foundation→Level 00 | 16 x 0.3 x 0.5 x 1.5 | 3.60 |
| Columns, Level 00→Level 01 | 16 x 0.3 x 0.5 x 3.6 | 8.64 |
| Columns, Level 01→Roof | 16 x 0.3 x 0.5 x 3.6 | 8.64 |
| Slab, Level 01 (and Roof, each) | 13.5 x 15.0 x 0.2 − 1.2 x 2.6 x 0.2 | 40.50 − 0.62 = 39.88 |
| Beams, Level 01 (and Roof, each) | (4 x 15.0 + 4 x 13.5) x 0.3 x 0.6 | 20.52 |
| Ground beams | (4 x 15.0 + 4 x 13.5) x 0.3 x 0.5 | 17.10 |
| Footings | 4 x 2.0² x 0.5 + 8 x 1.8² x 0.5 + 4 x 1.5² x 0.5 | 8.00 + 12.96 + 4.50 = 25.46 |

Beam figures are gross and include the 200 mm overlap with the slab and the overlap at column intersections; a joined-geometry take-off will show less.

## 5. What to send back

One message with:
1. Section 0 answers, the MCP server name, and the route used (A or B).
2. The Pilot Run zip path and the Doctor table.
3. For each step 3–17: status, the key numbers (compare step 6 against the hand figures and say gross or joined), the defects found vs. the four planted, and the exact error text for anything that failed.
4. The planted-defect misses, if any, and anything that took more than 5 minutes or froze Revit.
5. Screenshots (or the HTML reports) for Rule Check, Take-off, Rebar preview, IFC check and Asset Register.
6. Your own list: what was unclear in the ribbon, the dialogs or the reports, from the point of view of a BIM modeller using it for the first time.

Do not fix toolkit code. Do not run anything on another model. If a step cannot be done with the tools you have, say exactly which tool is missing and move to the next step.
