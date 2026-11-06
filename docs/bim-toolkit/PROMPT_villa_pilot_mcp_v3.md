# Prompt for the Claude + Revit MCP session: model a small villa and pilot the BIM Toolkit (v3)

Copy everything below the line into the Claude session that is connected to Revit through MCP.
Before you paste: complete section P on the Revit PC and replace the values in square brackets in section 0.

---

## P. Pre-flight (the person does this before pasting; the session cannot fix any of it)

The session must run **on the Windows machine that runs Revit**, as a local Claude Code or Cowork session. A cloud (claude.ai/code) session has no Revit, no pyRevit, no toolkit folder and cannot read `C:\`; pasting this prompt there produces no result.

| # | Check | Pass condition |
|---|---|---|
| P1 | Revit 2024, 2025 or 2026 open, no project loaded | Help > About shows version and build |
| P2 | pyRevit 4.8+ or 5.x installed **with its CLI on PATH** (`pyrevit --version` works in PowerShell) | `install\install.bat` ran without the red "pyRevit is not installed" line and printed "Installed" |
| P3 | **BIM Toolkit** tab visible after Revit restart, with panels Audit, Data, Docs, Geo, Coordination, Structure, Quantities, Planning, Handover, Settings | Ribbon |
| P4 | Revit MCP server registered in Claude (`claude mcp list` shows it connected); note its **name** | Claude |
| P5 | Toolkit folder exists | `[C:\Users\<user>\AppData\Roaming\BIMToolkit\0.14.1]\README.md` opens |
| P6 | Output folder exists and is empty | `[C:\BIM\villa_out]` |

## Rules that override anything else
- Work only in the new villa file you create. Never open or touch any other model.
- Every toolkit run is **preview first** (`apply: false`, the default). Apply only on the villa model, only after the preview is reviewed, and only in the steps marked "then apply".
- Report facts. If a tool call fails, quote the error. Do not describe a result you did not observe. Do not edit the toolkit's own code; log the defect instead.
- Units are metric (millimetres in the model, metres in this brief).
- The toolkit has never been run inside Revit (README §5, training video closing line). Treat every ERROR as a pilot finding, not as your mistake.

## 0. First, report your capabilities (before modelling)

Answer these in one short list, then continue:
1. Revit version and build, and whether the **BIM Toolkit** tab is visible.
2. The **name of the Revit MCP server** and its full tool list. State which tools give you (a) element creation and modification, (b) Python or C# execution inside Revit and which Python flavour (IronPython 2.7 or CPython 3), (c) file reads from the Windows disk. Run one harmless read call (document title or active view name) and quote the result. If (a) is missing, stop: the villa must be modelled by the person before section 3 can run.
3. Toolkit folder: `[C:\Users\<user>\AppData\Roaming\BIMToolkit\0.14.1]`. Read `README.md`, `docs/PILOT_QUICK_START.md` and `docs/PILOT_TEST_PROTOCOL.md` now. Confirm the ribbon map in section 3.2 against `pyrevit/BIMToolkit.extension` and report any button that differs.
4. Read `lib/rules_core.py` and `lib/rebar_codes.py` and answer two questions used in steps 5 and 10: does any `name_regex` target cover family **type** names, and is beam `As,min` checked on top bars as well as bottom bars? Quote the lines.
5. Output folder (empty, local): `[C:\BIM\villa_out]`
6. Survey grid EPSG: `[9358]` (KSA-GRF17 / UTM zone 38N; change if the demo site is elsewhere)

Route decision: route A if 2(b) is available, else route B (section 3.4). Say which route you are using and why.

## 1. Project set-up in Revit

1. New project from the **Structural** metric template (or the default metric template if none). Save as `VILLA-DEMO-ZZ-ZZ-M3-S-000001.rvt` in the output folder. Not workshared.
2. Project Information: Project Name `Villa demo`, Project Number `VILLA-DEMO`, Client `Training`.
3. Levels (elevation in m, name exactly). Set **Building Story** as shown; this fixes the IFC storey count and the COBie Floor count.

| Level | Elevation | Building Story | Use |
|---|---|---|---|
| Foundation | -1.50 | Yes | Top of footings |
| Level 00 | 0.00 | Yes | Ground floor FFL |
| Level 01 | +3.60 | Yes | First floor FFL |
| Roof | +7.20 | Yes | Roof slab |
| Parapet | +8.40 | **No** | Parapet top / tank slab |

4. Grids: letters along X (A, B, C, D at 0, 4.5, 9.0, 13.5 m), numbers along Y (1, 2, 3, 4 at 0, 5.0, 10.0, 15.0 m). Footprint 13.5 x 15.0 m to grid centrelines on a 20 x 25 m plot; grid A1 is 3.0 m from the front and side plot lines.
5. Shared coordinates: Survey Point at **E 672 100.000, N 2 734 900.000, elevation 612.000 m**, Project Base Point at grid A1, True North = Project North (0°). On EPSG 9358 this is **24.719° N, 46.702° E** (south Riyadh); step 13 checks against it.
6. Materials: `Concrete C30` (fc' 30 MPa) and `Rebar Grade 420` (fy 420 MPa). The material name must contain `C30`: the cost rate library matches concrete by the regex `C30|30 ?MPa`.
7. Create a 3D view named `IFC Export` and floor plans for every level (Create Views adds the rest).

## 2. Villa design brief (proposed design, for modelling only)

A concept with placeholder sizes; **not** an engineered design. No geotechnical report exists, so the bearing pressure is assumed. Every report you write must carry the line: *"Allowable bearing 150 kPa is an assumption pending a geotechnical report."*

**Structure: RC frame, SBC 304-2018 (ACI 318-14 basis, the toolkit's `SBC304` profile)**
- Concrete C30 for all elements; reinforcement Grade 420. Assign the concrete material to columns, framing, floors and foundations, the steel to the rebar bar types.
- Assumed allowable bearing 150 kPa at -1.5 m.
- Isolated footings under every column, top at Foundation level, 0.5 m thick. Family: Footing-Rectangular. Mark `F-<grid>`. Plan sizes are consistent with 150 kPa under an indicative service load (two 200 mm slabs, 300 x 600 beams, 3 kPa superimposed dead, 2 kPa live):

| Column position | Count | Indicative service load | Footing |
|---|---|---|---|
| Interior (B2, B3, C2, C3) | 4 | ~550 kN | 2.0 x 2.0 m |
| Edge | 8 | ~310 kN | 1.8 x 1.8 m |
| Corner (A1, A4, D1, D4) | 4 | ~190 kN | 1.5 x 1.5 m |

- Ground beams 300 x 500 mm along all grid lines, hosted on Foundation with a 900 mm offset (top at -0.60 m). Mark `GB-<n>`.
- Columns 300 x 500 mm at all 16 intersections, split per storey: Foundation→Level 00 (1.5 m), Level 00→Level 01 (3.6 m), Level 01→Roof (3.6 m). Long side along Y. Family: Concrete-Rectangular-Column. Mark `C-<grid>` (all three lifts carry the same mark).
- Beams 300 x 600 mm, top at level, along all grid lines at Level 01 and Roof. Family: Concrete-Rectangular Beam. Mark `B-<level>-<n>`.
- Slabs: **structural** floors, 200 mm at Level 01 and Roof, edges on grid lines A, D, 1 and 4, with a 1.2 x 2.6 m stair opening between grids B–C / 2–3. Ground floor: **structural** 150 mm slab on grade at Level 00, same edges (structural so the Structural discipline rates price it).
- Parapet: 200 mm block wall, 1.2 m high, base on Roof, around the perimeter. Stair bulkhead 3.0 x 3.0 m over the stair opening: 200 mm block walls Roof to +10.20 (3000 mm top offset) and a 150 mm slab on Roof with a 3000 mm height offset. Water tank slab 2.4 x 2.4 x 0.15 m on Roof over grids C–D / 3–4 with a 300 mm offset.
- Stair: two straight flights, 1.2 m wide, riser 170, going 280, Level 00 to Level 01 and Level 01 to Roof. If your tools cannot create a Stairs element, ask the person to place it and log "stair placed manually".

**Architecture**
- External walls 200 mm block on the grid lines, internal 150 mm block, base at the level, top constrained to the level above with a -600 mm offset. No plaster.
- Ground floor rooms (10): Entrance lobby 3 x 4; Men's majlis 4.5 x 6; Dining 4.5 x 5; Family living 4.5 x 6; Kitchen 4.5 x 4; Guest WC 1.5 x 2.5; Maid room 3 x 3; Maid WC 1.5 x 2; Store 2 x 2.5; Stair.
- First floor rooms (9): Master bedroom 4.5 x 6; Master bathroom 2.5 x 3; Dressing 2 x 3; Bedroom 2 4.5 x 5; Bedroom 3 4.5 x 5; Shared bathroom 2.5 x 3; Family hall 4.5 x 6; Laundry 2 x 3; Stair.
- Doors: main entrance 1.2 x 2.4; internal 0.9 x 2.1; bathrooms 0.8 x 2.1. Mark `D-<nn>`.
- Windows: 1.5 x 1.5, sill 0.9, one per habitable room per external wall; bathrooms 0.6 x 0.6, sill 1.8. Mark `W-<nn>`.
- Place a **Room** in every space, named as above, numbered `G01…` and `F01…`: **19 rooms**.
- MEP, categories matter (asset tag binding and the rule set):

| Item | Count | Revit category | Type name must contain | Mark |
|---|---|---|---|---|
| Split AC indoor unit | 5 (3 bedrooms, majlis, family living) | Mechanical Equipment | `Split AC` | `AC-01`…`AC-05` |
| Water heater | 4 (master bath, shared bath, guest WC, maid WC) | Plumbing Fixtures | `Water Heater` | `WH-01`…`WH-04` |
| Distribution board | 1 (store) | Electrical Equipment, **Panel Name** `DB-01` | `DB` | `DB-01` |

Deliberate defects to plant (record element IDs in your report):
1. Two identical windows at the same location (duplicate instance warning).
2. One column (middle lift, `C-B2`) with an empty `Mark`.
3. The Level 01 floor plan duplicated and left with its default name `Level 01 Copy 1` (naming rule NAM-003). A bad **type** name is not used: the shipped rules check sheet numbers, sheet names, view names and family-name prefixes, not type names.
4. One extra AC unit `AC-06` with no Room, placed 0.5 m outside the external wall at Level 00.

## 3. What the BIM Toolkit is and how to use it

### 3.1 Shape
- `lib/` shared library; `modules/m01…m27` each expose `run(opts) -> dict`; `pyrevit/BIMToolkit.extension` is the ribbon; `config/` holds rule files, rebar rules, rates, requirements; `docs/` holds `PILOT_QUICK_START.md` and `PILOT_TEST_PROTOCOL.md`. `README.md` has the module table.
- Every module writes to the **output folder** (HTML, CSV/XLSX, JSON) and returns a dict with `status` (`OK` / `ISSUES` / `PREVIEW` / `BLOCKED` / `ERROR` / `SKIPPED`).
- `apply` defaults to `false`. Apply runs in one Revit transaction that Ctrl+Z undoes.
- Project settings are saved to `bimtoolkit.project.json` beside the model file. Rule Check and Health Score read `<output folder>\rules\` once Project Setup has been imported, otherwise the toolkit's `config/rules/`.

### 3.2 Ribbon map (tab **BIM Toolkit**; confirm in section 0 item 3)
| Panel | Buttons → module |
|---|---|
| Audit | Warnings (m01), Rule Check (m05), Health Score (m06) |
| Data | Parameters (m02), Families (m09), Excel Export / Excel Import (m18) |
| Docs | Create Views (m07), Create Sheets (m08) |
| Geo | Coordinates (m03), Google Earth 3D (m10), Set-out Export (m11) |
| Coordination | Clash Detect (m12, m13 proposals), MEP Check (m14) |
| Structure | Rebar by Rules (m15), BBS (m16) |
| Quantities | Take-off (m04), Progress Dashboard (m17), 5D Cost (m22) |
| Planning | 4D Link (m21) |
| Handover | MIDP Tracker (m26), IFC Export (m23), COBie (m24), Asset Register (m27) |
| Settings | Project Setup (m25), Project Settings, Output Folder, Edit Rules, Doctor (m19), Pilot Run (m20) |

### 3.3 Project Setup (once, before any other button)
Settings > Output Folder → the folder from section 0. Settings > Project Setup > **Create** writes `BIM_Toolkit_Project_Inputs.xlsx` there. Fill:
- `General`: `project_name` Villa demo, `epsg` from section 0, `revit_version`, `meb_means_mep` Yes, shared parameter file `<output folder>\villa_shared.txt`. Leave library, titleblock and P6 file empty.
- `Requirements`: client `Training`, `project_code` **VILLA**, `originator` **DEMO**, `current_milestone` **30% Design**, `tag_site` **VILLA**, `tag_building` **DEMO**. These make the container check accept the model file name (fields VILLA-DEMO-ZZ-ZZ-M3-S-000001) and give the asset tag pattern `{site}-{building}-{level}-{code}-{seq:03d}`.
- `AIR classes`: the standard has no class for split units or water heaters (plumbing fixtures are not covered at all). Add two rows so the project layer overrides the standard: `Split AC unit | OST_MechanicalEquipment | (?i)split | AC | Manufacturer;Model` and `Water heater | OST_PlumbingFixtures | (?i)heater | WH | Manufacturer;Model`. Keep the standard's Distribution board row.
- `Rebar settings` / `Rebar rules`: keep the examples, set `fc_mpa` **30** (`fy_mpa` is already 420, profile `SBC304`, BBS `ACI315`, footing cover override 75 mm). They are placeholders for an engineer's design.
- `Rates`: the example rates are **all zero**. Enter demo values, leave the rest at 0: `S-CON-30` **450** SAR/m³ (material row, prices every C30 element once), `S-RB` **3200** SAR/t, `A-BLK` **95** SAR/m², `A-DR` **1800** SAR/nr, `A-WN` **1500** SAR/nr. Cost settings stay: prelims 10 %, OH&P 8 %, VAT 15 %.
- `MIDP`: two rows: `VILLA-DEMO-ZZ-ZZ-M3-S-000001` (Model, 30% Design, due today + 7, required status S2) and `VILLA-DEMO-ZZ-00-DR-S-000101` (GA plan Level 00, same milestone, S2).
- Everything else empty (the toolkit falls back to its standard and flags it "not confirmed by client").
Save, then Project Setup > **Import** > review the preview and the where-from table (OK / STANDARD / MISSING / CHECK) > Yes. Expect WARNs for placeholder rates and example contacts, no ERROR.

### 3.4 Two ways to run modules
- **Route A, code execution.** Run a module as `dynamo/runner_stub.py` does:
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
  Under IronPython 2.7 use the built-in `reload(mod)` instead of `importlib.reload`. Running the modules from an MCP code executor has never been tested and is itself part of the pilot. If `bim_core` cannot find the active document, quote the error and switch to route B.
- **Route B, ribbon.** Ask the person to click the button, choose Preview, and tell you when it finishes. Read the report in the output folder (`*.html`, `*.csv`, `*.json`) and the pyRevit output window text they paste.

### 3.5 Three rules for real projects (teach these back in your report)
1. Preview, review, then apply. 2. Synchronise before apply on workshared models. 3. First runs on a detached copy, never the central model. (The villa is not workshared, so rule 2 does not apply here.)

## 4. Test sequence (in this order; stop and report at any ERROR)

| # | Step | Expected on the villa | Then apply? |
|---|---|---|---|
| 1 | Settings > Doctor | PASS: Revit version, toolkit folder, module imports, output folder writable, EPSG, georeferenced, grids, bar types, titleblocks, API members. WARN: shared parameter file (until step 3), family library unset. INFO for version fallbacks | – |
| 2 | Settings > Pilot Run | All steps preview, no ERROR; 4D step SKIPPED (no P6 file); zip in `BIMToolkit_pilot\<model>_<stamp>` | – |
| 3 | Data > Parameters | Preview lists the 18 spec parameters to bind: BIM_Easting, BIM_Northing, BIM_Elevation, BIM_Latitude, BIM_Longitude, BIM_Status, BIM_Zone, BIM_BarMark, BIM_ActivityID, BIM_PlannedStart, BIM_PlannedFinish, BIM_Start, BIM_Finish, BIM_4DStatus, BIM_Suitability, BIM_ContainerID, BIM_Revision, BIM_AssetTag | **Yes**. Record whether `villa_shared.txt` was created or an error was raised |
| 4 | Audit > Warnings | Finds the duplicate window (defect 1), marked auto-fixable | **Yes** – duplicate deleted; confirm by Ctrl+Z then redo |
| 5 | Audit > Rule Check, Health Score | Fails: STR-001 on `C-B2` (defect 2), NAM-003 on `Level 01 Copy 1` (defect 3). Also expected, not defects: ALL-001 BIM_Status empty on every structural element, NAM-004 on every stock family (no discipline prefix), LOIN 30 % rule on the same column. Health below 75 (Poor) is expected; report score and the top-fixes list | – |
| 6 | Quantities > Take-off | Volumes per level and category against the hand figures below. State gross or joined; joined volumes run up to ~10 % lower on columns and beams | – |
| 7 | Quantities > 5D Cost | Total > 0 SAR. Concrete priced once by `S-CON-30`; element lines for columns, beams, slabs, footings listed as excluded (counted once). Direct concrete cost ≈ 206 m³ x 450 x 1.025 ≈ **95 k SAR** gross, less if joined. Unpriced list contains only MEP equipment and plumbing fixtures. Markups and VAT applied in order | – |
| 8 | Geo > Coordinates, Set-out Export, Google Earth 3D | Column E/N within 0–13.5 m E and 0–15 m N of E 672 100 / N 2 734 900 (A1 = survey point), elevations 610.5–619.2; CSV + DXF; KMZ opens at 24.72 N / 46.70 E facing north | **Yes** for Coordinates (writes BIM_Easting… parameters) |
| 9 | Docs > Create Views, then Create Sheets | Create Views: structural plans per level, sections along every straight grid, names skipped if present. Then write `sheet_register.csv` in the output folder in the format of `config/sheet_register_example.csv` using the **view names Create Views actually created**: S-101 Foundation, S-102 Level 00, S-103 Level 01, S-104 Roof, S-201 sections on grids B and 2. Sheets created with the template's title block, views arranged | **Yes** both |
| 10 | Structure > Rebar by Rules (SBC304) | Preview per host: columns 8 H16 (3 per face) + H10@150 ties, beams 3 H16 B + 2 H12 T + H10@150, footings H16@150 both ways, 75 mm cover; code check shown. 2 H12 top (226 mm²) is below ACI/SBC §9.6.1.2 minimum (≈540 mm²): if section 0 item 4 found that top bars are checked, expect a BLOCKED or WARN on every beam; if not, log "top-steel As,min not checked" as a toolkit finding. Then apply for **one column and one beam only** (`selection_ids`); confirm rebar appears and Ctrl+Z works | partial |
| 11 | Structure > BBS (ACI 315) | Bar marks, shape codes from `bbs_shape_map.json` (`?` for unmapped shapes: list them), cut lengths rounded up to 25 mm, weights d²/162.2, for the two members above | – |
| 12 | Coordination > Clash Detect, MEP Check | Clash Detect: no pairs apply (no pipes, ducts, trays); expect zero clashes or "nothing to check". MEP Check tests open ends, systems, slope, insulation, short runs only; it **does not check room assignment**, so `AC-06` will not appear here. State both outcomes | – |
| 13 | Handover > IFC Export | Choose **IFC4 RV** from view `IFC Export`. Check report: category counts within 2 %, no duplicate GlobalIds, **4 storeys**, IfcSite 24.72 N / 46.70 E; record whether IfcMapConversion / IfcProjectedCRS are present (depends on the exporter's site placement setting); required property sets from the example list | – |
| 14 | Handover > COBie (design stage) | Floor **4 rows**; Space **19**; Component: every door and window plus 6 AC, 4 WH, 1 DB (`AC-06` with empty Space); Type per family type; Contact from the example config flagged as example; validation lists missing identity data | – |
| 15 | Handover > Asset Register | AC units class `Split AC unit` code AC (project layer), water heaters code WH (project layer), board code DB (standard, flagged not confirmed). Tags `VILLA-DEMO-01-AC-001`… per level (level codes 00 / 01 / RF), `AC-06` tagged with empty space; completeness per class shows Manufacturer and Model missing | **Yes** – tags written to BIM_AssetTag where empty |
| 16 | Handover > MIDP Tracker | Model row NOT STARTED (BIM_Suitability empty) with container naming PASS; `VILLA-DEMO-ZZ-00-DR-S-000101` NOT STARTED; S-101… NOT IN MIDP; sheet numbers pass the regex | – |
| 17 | Data > Excel Export, Excel Import | Export structural columns with Mark; change one Mark in Excel, change a different Mark in Revit after the export; Import preview: one WOULD SET, one CONFLICT | **Yes** |

**Hand figures for step 6 (gross geometry, to grid centrelines)**

| Item | Calculation | m³ |
|---|---|---|
| Columns, Foundation→Level 00 | 16 x 0.3 x 0.5 x 1.5 | 3.60 |
| Columns, Level 00→Level 01 | 16 x 0.3 x 0.5 x 3.6 | 8.64 |
| Columns, Level 01→Roof | 16 x 0.3 x 0.5 x 3.6 | 8.64 |
| Slab, Level 01 (and Roof, each) | 13.5 x 15.0 x 0.2 − 1.2 x 2.6 x 0.2 | 39.88 |
| Slab on grade, Level 00 | 13.5 x 15.0 x 0.15 | 30.38 |
| Beams, Level 01 (and Roof, each) | (4 x 15.0 + 4 x 13.5) x 0.3 x 0.6 | 20.52 |
| Ground beams | (4 x 15.0 + 4 x 13.5) x 0.3 x 0.5 | 17.10 |
| Footings | 4 x 2.0² x 0.5 + 8 x 1.8² x 0.5 + 4 x 1.5² x 0.5 | 25.46 |
| Total structural concrete (excl. bulkhead and tank slabs) | | **≈ 215** |

Beam figures include the 200 mm overlap with the slab and the overlaps at columns; a joined take-off shows less.

## 5. What to send back

One message with:
1. Section 0 answers, the MCP server name, the route used, and the two code answers from item 4.
2. The Pilot Run zip path and the Doctor table.
3. For each step 3–17: status, key numbers (step 6 against the hand figures, gross or joined), defects found vs. the four planted, exact error text for anything that failed.
4. Planted-defect misses, anything over 5 minutes, anything that froze Revit.
5. Screenshots or HTML reports for Rule Check, Take-off, Rebar preview, IFC check and Asset Register.
6. Your own list: what was unclear in the ribbon, dialogs or reports for a first-time BIM modeller.

Do not fix toolkit code. Do not run anything on another model. If a step cannot be done with the tools you have, say exactly which tool is missing and move to the next step.
