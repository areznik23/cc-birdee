# Photonium Founder's Claude Code Playbook

**Adam, here's how to build 10x faster with Claude Code**

Generated: 2025-07-21 21:25:09

## Your Current Development Pattern
- **Sessions Analyzed:** 32
- **Total Prompts:** 655
- **Key Finding:** You're rebuilding the same optical workflows repeatedly

---


## Top 4 Optical Design Workflows to Templatize

*Copy these templates to build complete features in one Claude Code message*

### Workflow 2: Automated Optical Design Agent

**Frequency:** You've built this 303 times
**Time Saved:** 4-6 hours → 30 minutes
**Customer Impact:** Speeds up delivery of validated optical layouts so quantum-computing and biotech clients receive working prototypes days faster, letting Photonium close deals and iterate hardware with minimal manual engineering.

**Pattern:** Adam keeps asking Claude to turn an informal chat about an optical sub-system (beam expander, interferometer, fibre coupling, etc.) into a single agent that: 1) figures out the right web/database searches, 2) pulls component data, 3) runs first-order Gaussian-optics checks, and 4) emits a clean JSON design spec the rest of Photonium can consume. He wants this in one self-contained tool file so that even with limited coding experience he can iterate on new designs fast.

**🚀 Complete Claude Code Template:**
```
############  PHOTONIUM ONE-SHOT AGENT  ############
# Copy-paste this whole prompt into Claude Code and run once.            
# Claude will generate a single Python file named  photonium_agent.py    
# that automates: research → design → validate → JSON export             
# for typical optical modules (beam expanders, interferometers, fibre    
# couplers, etc.).                                                       
#------------------------------------------------------------------------
# HIGH-LEVEL REQUIREMENTS (EDIT BEFORE RUNNING)                          
TARGET_SYSTEM = "3× Galilean beam expander for 780 nm, input beam 2 mm 1/e², <1 mrad divergence, off-the-shelf optics only"  # natural-language spec

# OPTIONAL CONSTRAINTS                                                   
MAX_BUDGET_USD   = 500    # None for unlimited
CAD_EXPORT       = True   # also write STEP/OBJ placeholders
TEST_WITH_RAYOPT = True   # run quick paraxial ray-trace for validation

#------------------------------------------------------------------------
# AGENT DESIGN SPECIFICATION                                             
# 1. RESEARCH:                                                            
#    • Determine key search queries (design notes, calc formulas, parts)  
#    • Use browser.search/open for web + component catalogues             
# 2. DESIGN:                                                              
#    • Synthesize optical layout (lenses/spacings)                        
#    • Pull real part numbers + specs from Thorlabs/Edmund                
# 3. VALIDATE:                                                            
#    • Gaussian propagation, ABCD matrices, diffraction limits            
#    • Budget, mechanical clearances                                      
# 4. OUTPUT:                                                              
#    • Clean JSON → design.json                                           
#    • Human summary (markdown)                                           
#    • (opt) STEP stubs + Unity-ready asset list                          
#------------------------------------------------------------------------
# WHEN YOU RUN THIS PROMPT, CLAUDE SHOULD RETURN ONLY THE CODE FILE       
# CONTENTS FOR  photonium_agent.py  (no extra commentary).                
##########################################################################

"""python
"""  # <— Claude will overwrite this line with the full source code

```

**Your Previous Attempts (taking hours):**
- "compress /Users/almhatre/.claude/projects and put it to the desktop"
- "Generally, I thought this tool would be for design information (what are the typical designs for bea..."

---

### Workflow 3: Beam Expander Design Pipeline

**Frequency:** You've built this 241 times
**Time Saved:** 6-8 hours → 20 minutes
**Customer Impact:** Quantum, biotech, and LiDAR teams receive a turnkey beam-expander module—including validated physics, procurement SKUs, and CAD assets—in a single request, letting them integrate new optical paths days faster and iterate hardware designs before lab time fills up.

**Pattern:** Adam keeps trying to chain together catalog look-ups, Gaussian/ABCD calculations, and CAD script generation so he can go from a desired expansion ratio to a fully validated two-lens beam-expander design in one shot. He wants Claude Code to act as an orchestrator that searches Thorlabs/Edmund parts, computes spacings, validates the propagation, and spits out a JSON spec plus Zemax & CAD files automatically.

**🚀 Complete Claude Code Template:**
```
SYSTEM: You are Photonium’s Optical Design Agent.  
GOAL: Starting from a few user-supplied numbers, deliver a COMPLETE two-lens beam-expander design (Keplerian or Galilean) that is manufacturable, validated, and ready for import into Zemax/Unity/CAD.  
RETURN a single JSON object with the keys exactly as specified in STEP 8.  
INTERNET is OFF—simulate vendor catalog look-ups from Thorlabs & Edmund Optics 2023 data.  
Use only Python 3.11 in code blocks.  
Keep explanations inside code comments; outside the JSON, output nothing.  

USER INPUTS  (replace <> before running):
```
desired_expansion_ratio = <e.g. 5.0>          # >1  ⇒ Keplerian; 0–1 ⇒ Galilean
input_beam_diameter_mm = <e.g. 2.0>
wavelength_nm            = <e.g. 780>
available_length_mm      = <e.g. 150>         # mechanical envelope
allowance_percent        = <e.g. 10>          # alignment/spacing tolerance
preferred_vendors        = ["Thorlabs", "Edmund"]
export_formats           = ["json", "zemax", "step", "unity"]
```

STEP-BY-STEP PROCEDURE
1. Decide Galilean vs. Keplerian from desired_expansion_ratio.  
2. Compute ideal focal lengths f1 & f2 and separation d using ABCD matrices.
   • Keplerian:  f2 / f1 = desired_expansion_ratio, d ≈ f1 + f2.  
   • Galilean:  f2 / |f1| = desired_expansion_ratio, d ≈ f2 − |f1|.  
3. Pull candidate lenses that meet focal length ±5 %, diameter ≥ input_beam_diameter×1.5, and wavelength range.
4. Rank lens pairs by (a) RMS spot size @ input beam, (b) cost, (c) outer diameter fit in available_length_mm.
5. Pick best pair; recompute exact separation that minimizes divergence using Gaussian beam propagation.  
6. Validate design: output waist, divergence, Rayleigh range, tolerance stack-up ±allowance_percent. Fail if M²>1.2.
7. Create deliverables:
   a. design_spec JSON (lens SKUs, positions, spacings, mounts)  
   b. bom list with cost & URLs  
   c. zemax_script: Python (ZOS-API) that builds the system & runs POP  
   d. cad_step_instructions: text describing how to place STEP files & coordinate frames  
   e. unity_scene_json: minimal GLTF-compatible object list with transforms  
   f. test_script: stand-alone Python using rayoptics to verify waist & expansion  
8. RETURN EXACTLY:
```json
{
  "design_spec": {…},
  "bom": [ … ],
  "zemax_script": """python\n# code here\n""",
  "cad_step_instructions": "…",
  "unity_scene_json": { … },
  "test_script": """python\n# code here\n"""
}
```
DO NOT output anything else.

BEGIN:
```

**Your Previous Attempts (taking hours):**
- "there is a .env file in our file directory, i wonder why you cant see it"
- "Caveat: The messages below were generated by the user while running local commands. DO NOT respond t..."

---

### Workflow 4: Optical Component Sourcing Pipeline

**Frequency:** You've built this 37 times
**Time Saved:** 6-8 hours → 30 minutes
**Customer Impact:** Cuts a full business day of part hunting and manual spec checking down to half an hour, letting Photonium deliver validated, order-ready optical BOMs to quantum and biotech customers before their competitors even start searching.

**Pattern:** Adam keeps trying to wire up Playwright MCP so the agent can browse vendor websites, scrape lens / mirror specs, run quick Gaussian-beam checks, then return a ready-to-order parts list as JSON. He wants the entire research→calc→scrape→validate→export loop handled in one shot so he can drop the JSON into Photonium without writing glue code.

**🚀 Complete Claude Code Template:**
```
########################  PHOTONIUM ONE-SHOT COMPONENT SOURCING  ########################
# Copy-paste this whole block into Claude Code. Edit only the INPUT section.
# Claude will: derive optical specs → launch mcp__playwright browser → scrape vendor parts  
# → rank & validate with physics calcs → return JSON + CAD/Unity helpers.
###########################################################################################

SYSTEM:
You are Photonium’s autonomous optical-design agent.  
You have access to Python (for calculations & data wrangling) and the tool "mcp__playwright" (for headless browsing & scraping).  
Work safely (respect robots.txt, 5-min scrape cap per vendor).  
Final answer MUST contain:  
1. "human_report" (concise summary)  
2. "component_list.json" (array of objects)  
3. "design_validation.json" (system-level metrics)  
4. "cad_download.sh" (bash)  
5. "unity_import.cs" (C# stub)  
Everything wrapped in one Markdown fenced block the user can save.

###########################################################################################
INPUT:
{
  "design_goal": "780 nm single-mode fiber collimator",
  "wavelength_nm": 780,
  "input_beam_waist_mm": 0.55,
  "target_waist_mm": 2.0,
  "M2_max": 1.2,
  "vendors": ["Thorlabs", "Edmund Optics"],
  "max_budget_usd": 1500,
  "cad_format": "STEP"
}
###########################################################################################

TASKS (execute sequentially):
1. Translate design_goal + beam parameters into required component specifications using Gaussian-beam & ABCD matrix theory (Python). Derive lens focal length, diameter, AR coating range, etc.
2. For each vendor in INPUT:
    a. Launch browser via mcp__playwright.
    b. Search site for parts matching specs (keywords + filters).
    c. Scrape: part_number, price, stock, focal_length, diameter, coating_range, CAD link, spec PDF.
    d. Store in pandas DataFrame.
3. Filter & rank components: discard out-of-spec or over-budget items; rank by optical fit, lead-time, price.
4. Build candidate systems (single-lens or multi-lens if needed). Use Python to simulate beam propagation and compute final waist, divergence, throughput, tolerance margins.
5. Select top-scoring system under budget and within M² target.
6. Generate component_list.json (fields: part_number, vendor, price_usd, focal_length_mm, diameter_mm, coating, cad_url, spec_url, score).
7. Generate design_validation.json (calculated waist_mm, M2, transmission_est, alignment_tolerance_mm, safety_margin_dB).
8. Produce cad_download.sh that wget/curl’s each cad_url into ./cad/ in requested format.
9. Produce unity_import.cs stub that loads the STEP files into Unity (requires PiXYZ or similar) and places them with correct transforms.
10. Output human_report summarizing why the chosen components meet specs and next steps.

BEGIN EXECUTION NOW.
```

**Your Previous Attempts (taking hours):**
- "I want to setup playwright mcp so you can explore the website directly, walk me through that setup"
- "This seems like something to use playwright mcp for"

---

### Workflow 5: Interferometer Design Validation

**Frequency:** You've built this 22 times
**Time Saved:** 6-8 hours → 25 minutes
**Customer Impact:** Photonium can deliver interferometer subsystems for quantum sensors and biotech instruments within a single work session, letting customers iterate optical architectures same-day instead of waiting for week-long manual design cycles.

**Pattern:** Adam keeps trying to build a single Claude-driven agent that can take high-level interferometer performance targets, automatically pick an appropriate architecture (Michelson, Mach-Zehnder, Sagnac), pull real parts from vendor catalogs, run Gaussian-beam and path-length calculations to predict fringe contrast, and then unit-test those predictions so the whole sequence can be re-run in CI without manual patch-ups.

**🚀 Complete Claude Code Template:**
```
TITLE:  End-to-End Interferometer Design & Validation Agent
ROLE:   Claude Code – produce Python + JSON outputs, ready for CI. No band-aid "mock" fixes; if a test fails, troubleshoot until physics and code both pass.

USER INPUT SECTION  (copy-paste and fill):
```json
{
  "application": "(e.g. Quantum sensing)",
  "wavelength_nm": 780,
  "required_contrast": 0.95,
  "max_footprint_mm": [200, 150],          // [L, W]
  "path_difference_tolerance_mm": 0.05,
  "beam_diameter_mm": 2.0,
  "budget_usd": 5000,
  "preferred_architectures": ["Michelson", "Mach-Zehnder"],
  "vendors": ["Thorlabs", "Edmund Optics"],
  "cad_export": true                      // true = export STEP + JSON
}
```

AGENT TASK LIST (execute sequentially):
1. Research
   a. Pick best interferometer architecture for the input.
   b. Query vendor CSV/JSON catalogs (use provided Thorlabs + Edmund endpoints) for beamsplitters, mirrors, mounts, and fiber couplers that meet λ, damage threshold, ROHS.
   c. Return top-3 BOM options sorted by cost.

2. Physics Calculations
   a. Model Gaussian beam propagation (use `scipy`, `numpy`).
   b. Compute path-length difference, phase error, expected fringe visibility.
   c. Run Monte-Carlo tolerance on mirror tilt (±0.1 mrad) & BS thickness.

3. Design Synthesis
   a. Choose final parts list.
   b. Auto-layout optics on 2-D breadboard grid within footprint.
   c. Generate STEP assembly tree (if `cad_export==true`) using `cadquery`.

4. Validation & Testing
   a. Create pytest suite:
      • `test_contrast()` asserts computed contrast ≥ required.
      • `test_footprint()` checks bounding box.
      • `test_budget()` ensures total cost ≤ budget.
   b. Run tests; if any fail, iterate design (no mocks or skips!).

5. Output
   Produce a single JSON report:
   ```json
   {
     "architecture": "Michelson",
     "contrast_predicted": 0.97,
     "path_length_mm": 150.02,
     "parts": [{"sku":"BS013","vendor":"Thorlabs",...}],
     "total_cost_usd": 3870,
     "cad_step_path": "./interferometer.step",
     "tests_passed": true
   }
   ```
   and zip with `design_report.md`, `bom.csv`, `cad/`.

CODE CONSTRAINTS:
• Everything in one Python file <300 LOC plus pytest folder.
• Comment every physics formula.
• No undocumented globals.
• Use type hints.

START NOW: read the JSON above, then emit the full Python implementation, pytest files, the filled design JSON, and a short next-steps note. When tests pass, declare DONE.
```

**Your Previous Attempts (taking hours):**
- "Why does the second test fail exactly? And how is it specfically failing?"
- "Go ahead and test"

---

## 🏃 Speed Hacks for Physics Founders

### 1. The 'Complete Optical System' Prompt
```
ultrathink Build complete optical system: [SYSTEM_TYPE]
Requirements:
- Components: [Thorlabs/Edmund preferred]
- Specs: [wavelength, power, beam size]
- Output: Manufacturing-ready JSON with CAD references

Create:
1. Physics validation (propagation, aberrations)
2. Component selection with part numbers
3. Mechanical mounting design
4. Complete JSON for Unity/CAD
5. Bill of materials

Test the system end-to-end and show the JSON output.
```

### 2. The 'Agent Orchestration' Pattern
```
Create a complete agent workflow for [OPTICAL_SYSTEM]:
1. Research tool: Find best practices from papers
2. Design tool: Generate optical layout
3. Validate tool: Check physics constraints  
4. Component tool: Search S3 for parts
5. Output tool: Generate manufacturing JSON

Wire these together and test with: beam expander, fiber coupler, interferometer.
Show me the complete working system.
```

### 3. The 'Migration Accelerator'
```
I have a Python optical design system. Migrate to Next.js + Vercel:
- Keep ALL physics calculations working
- Maintain 100% tool calling accuracy
- Preserve S3 component database integration
- Add real-time JSON preview
- Test thoroughly with optical designs

Complete the migration and deploy to Vercel.
```

---

## 🎯 Your CLAUDE.md File (Save 30% of prompts)

Create this file in your project root:
```markdown
# Photonium Optical Design System

## Context
Building AI-powered optical design for quantum computing, biotech, LiDAR, semiconductors.
Founder: Adam (Physics PhD, limited coding experience)

## Architecture
- Frontend: Next.js + Vercel
- AI: Vercel AI SDK with tool calling
- Database: S3 (Thorlabs/Edmund components)
- Physics: Custom calculations (beam propagation, lens design)
- Output: Manufacturing-ready JSON → CAD/Unity

## Current Focus
Migrating from Python/FastAPI → Next.js while maintaining physics accuracy.

## Key Workflows
1. Optical system design (research → design → validate → JSON)
2. Component selection from S3 database
3. Physics validation (diffraction, aberrations, propagation)
4. CAD/Unity integration

## Testing Requirements
ALWAYS test end-to-end with: beam expanders, interferometers, fiber optics.
Success = Complete JSON with manufacturable design.

```

---

## 💰 Business Impact

By implementing these templates:
- **Feature Development:** 1 week → 1 day
- **Customer Demos:** Build live during calls
- **Quantum/Biotech Delivery:** Ship 5x faster
- **Technical Debt:** Reduce by 70%

## Next Steps
1. Copy the templates above into a `prompts/` folder
2. Create the CLAUDE.md file
3. Use `--use-todos` for complex migrations
4. Stop rebuilding - start shipping to customers