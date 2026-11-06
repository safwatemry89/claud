# Changes from v2 to v3 (verified against the toolkit source on Google Drive: README, CHANGELOG, config/, install/, training transcript)

| # | Where | v2 defect | v3 fix | Source |
|---|---|---|---|---|
| 1 | Defect 3 | A bad beam **type** name is not caught: shipped naming rules target sheet numbers, sheet names, view names and family-name prefixes only | Defect 3 is now a duplicated view left as `Level 01 Copy 1` (NAM-003). Session must still confirm in `rules_core.py` (section 0 item 4) | `config/rules/naming_iso19650.json`, `config/requirements/standard.json` |
| 2 | Step 5 | Expected failures incomplete | Added expected non-defect failures: ALL-001 (BIM_Status empty), NAM-004 (every stock family), LOIN 30 % rule; Health expected Poor | `config/rules/modelling_data.json`, `standard.json` loin |
| 3 | Step 7 / §3.3 Rates | "Keep the demo rates": every example rate is **0**, so the total would be 0 SAR | Five demo rates specified; material name must contain `C30`; expected ≈ 95 k SAR gross concrete; counted-once behaviour stated | `config/cost/rates_example.csv`, CHANGELOG 0.11 |
| 4 | Step 3 | `BIM_ActivityId`, list incomplete | Full 18-parameter list, correct `BIM_ActivityID` | `config/parameters_spec.csv` |
| 5 | §2 MEP | Categories unspecified; asset tags bind only to Mechanical Equipment, Electrical Equipment, Plumbing Fixtures; ELE-001 needs Panel Name | Category table with type-name keywords and Panel Name `DB-01` | `parameters_spec.csv`, `modelling_data.json` |
| 6 | Step 15 / §3.3 | Standard AIR has no class for split units or water heaters; tag pattern needs `tag_site` and `tag_building` | Two AIR rows added on the project layer; Requirements sheet values given so tags read `VILLA-DEMO-01-AC-001` | `standard.json` air_classes, tag_rule |
| 7 | Step 16 / §3.3 | Container check needs project code and originator | `project_code` VILLA, `originator` DEMO, milestone 30 % Design set on the Requirements sheet; field limits verified (Project 2–6, Originator 3–6, Type M3, Role S, Number 4–6 digits) | `standard.json` naming_fields |
| 8 | Step 9 | Create Sheets needs a sheet register CSV; v2 did not say so | Register written after Create Views, using the created view names; format from the example | `config/sheet_register_example.csv`, CHANGELOG 0.4 |
| 9 | Step 12 | MEP Check expectation vague | States the five checks it runs and that room assignment is not one of them | README m14, `mep_integrity.json` |
| 10 | Step 14 | COBie counts | Floor = 4 (Building Story), Component includes all doors and windows (default component categories) | `cobie_config_example.json`, README COBie |
| 11 | Step 13 | IFC version wording | IFC4 **RV** named; map-conversion presence to be recorded, not assumed | README IFC |
| 12 | §2 / step 10 | Code citation "ACI 318-19" | Profile is SBC 304-2018 on an ACI 318-14 basis; top-steel check made conditional on the code answer from section 0 item 4 | README rebar table, `rebar_project_example.json` |
| 13 | §3.4 route A | `importlib.reload` fails on IronPython 2.7 | Note added to use `reload()` | `dynamo/runner_stub.py` (CPython3 target) |
| 14 | Section P | pyRevit CLI requirement missing | `install.ps1` exits if the `pyrevit` CLI is not on PATH; added to P2 | `install/install.ps1` |
| 15 | Step 1 / 2 | Doctor and Pilot Run expectations incomplete | Doctor checks listed (library WARN, bar types, titleblocks, INFO fallbacks); Pilot Run 4D step SKIPPED | CHANGELOG 0.9, 0.10 |
| 16 | §1 / §3.1 | Settings file location unstated | `bimtoolkit.project.json` beside the model; rules read from `<out_dir>\rules` after import | CHANGELOG 0.2, 0.13 |
| 17 | §2 slab on grade | Non-structural allowed | Made structural so Structural-discipline rates price it | `rates_example.csv` Discipline column |
| 18 | Step 6 table | SOG missing | Slab on grade and total added (≈ 215 m³) | – |

Not verified in code (the `lib/` and `modules/` folders had not finished mirroring): whether `name_regex` can target type names, whether beam top steel is checked against As,min, and whether m02 creates a missing shared parameter file. The prompt makes the Revit session read and quote those lines before the steps that depend on them.
