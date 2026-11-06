# Changes from v1 to v2 of PROMPT_villa_pilot_mcp.md

| # | Where | v1 defect | v2 fix |
|---|---|---|---|
| 1 | New section P | Prompt could be pasted into a session with no Revit, pyRevit, toolkit folder or Revit MCP server (this happened: a cloud session on an unrelated repo). | Pre-flight table P1–P6 the person completes before pasting; session must run on the Revit machine. |
| 2 | Section 0 item 2 | Revit MCP server never named; no smoke test. | Session must name the server, list tools, run one read call, and stop if element creation is missing. |
| 3 | Section 1.3 | Building Story not set; step 13 said 4 storeys, step 14 said 5 floors. | Parapet marked not a Building Story; steps 13 and 14 made consistent (4 storeys; COBie 4 or 5 with the reason stated). |
| 4 | Section 1.5 / step 13 | Lat/long check given as 46.68 E. UTM 38N inverse of E 672 100 / N 2 734 900 is 24.719 N / 46.702 E. | Corrected to 24.72 N / 46.70 E in both places. |
| 5 | Section 2 footings | 1.8 x 1.8 m interior footing gives 3.24 m² x 150 kPa = 486 kN, below the ~550 kN indicative service load from the stated slabs and beams. | Interior 2.0 x 2.0, edge 1.8 x 1.8, corner 1.5 x 1.5, with the load basis tabulated. Geotechnical caveat made a mandatory report line. |
| 6 | Section 2 slabs | Slab footprint ambiguous (centreline vs. outer face), which changes the step 6 check by ~2.6 m³. | Edges fixed on grid lines A, D, 1, 4. |
| 7 | Section 2 bulkhead / tank | Elements above Roof had no host level stated. | Hosted on Roof with explicit offsets; no extra level, so storey count unchanged. |
| 8 | Section 2 rooms / MEP | "~20 spaces" and unspecified counts of AC and WH. | 19 rooms counted; 5 AC + 1 planted + 4 WH + 1 DB with marks. Planted AC given Mark AC-06 so it is traceable. |
| 9 | Section 3.3 | Rebar settings changed fc only. | fy_mpa = 420 also set to match section 2. |
| 10 | Step 6 | Hand check used 3.6 m for every storey; lower lift is 1.5 m. No statement on gross vs. joined volumes. | Full hand-figure table (columns per lift, slabs, beams, ground beams, footings) with gross/joined rule. |
| 11 | Step 10 | 2 H12 top steel is below ACI 318-19 §9.6.1.2 minimum at continuous supports; prompt did not use this as a test of the ratio check. | Expected ratio WARN added; absence is logged as a toolkit defect. |
| 12 | Step 8 | Column coordinates described only as "near" the survey point. | Range given (0–13.5 m E, 0–15 m N of the survey point, A1 = origin). |
| 13 | Section 2 stairs | Stairs creation through the Revit API frequently fails from external executors. | Manual-placement fallback with a report note. |

Not fixable from this session: the environment. The session that ran this audit is a Linux cloud container attached to `safwatemry89/claud` (Metabolic-90). It has no Revit host and your computer SAFWAT offers no folder to cloud sessions. Run v2 in a local session on the Revit machine.
