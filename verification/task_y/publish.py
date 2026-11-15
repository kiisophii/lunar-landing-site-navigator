"""Publish independent evidence only after every required check succeeds."""
import json,os,subprocess
from datetime import datetime,timezone,timedelta
from pathlib import Path
p=Path('docs/task_y_independent')
s=json.loads((p/'summary.json').read_text())
assert s['passed'] and s['complete'] and len(s['sites'])==3
tests=(p/'focused_tests.txt').read_text()
assert 'passed' in tests and 'failed' not in tests
contract=json.loads((p/'terrain_contract.json').read_text())
assert contract['errors']==[]
ledger=Path('docs/verification_ledger.md')
text=ledger.read_text()
marker='## Task Y independent member verification — PR #75'
assert marker not in text,'Evidence already published; inspect before appending again'
text+='\n'+marker+'\n\n'
text+='Checked PR head '+s['reviewed_sha']+' by Minchul Kim (producer: Jiyong Sung). Three original DEMs/sites: Haworth 5 m, Nobile Rim2 10 m, IM1 20 m. Own generic least-squares fits, scipy bilinear samples, PROJ/haversine masks and area sums; no pipeline/web numerical imports. Every native centre inside 100/500/1000 m circles re-evaluated.\n\n'
text+='Maximum slope difference '+format(s['max_abs_slope_deg'],'.12g')+' deg (criterion <=0.5); flat-area difference '+format(s['max_abs_flat_pp'],'.12g')+' pp (criterion <=1). Result **PASS** for the requested three-site scope. All 33 content hashes and relay-centre copies pass; terrain-specific contract and focused tests pass. Roughness additionally compared, max '+format(s['max_abs_roughness_m'],'.12g')+' m (diagnostic, no task threshold). [Report](task_y_independent/report.md), [all comparisons](task_y_independent/comparisons.csv), [source/byte evidence](task_y_independent/summary.json). No production data changed. Existing author-only statement remains a historical PR snapshot; this appendix supplies the separate member check, not a full 16-site numerical verification or physical safety certification.\n'
ledger.write_text(text)
stamp=datetime.now(timezone(timedelta(hours=9))).strftime('%Y-%m-%d %H:%M')
with Path('docs/SI_USAGE.md').open('a') as f:
    f.write('\n| '+stamp+' (KST) | Minchul Kim | Independent verification of task Y PR #75 | ChatGPT Codex (GPT-6) | Pin PR head; independently read original PGDA 5/10/20 m byte windows and recompute exact-coordinate slopes, all native radius distributions and area fractions at 3 sites; diagnostic roughness and 33-site provenance audit; retain source hashes and tests | verification/task_y/, .github/workflows/verify-task-y-member.yml, docs/task_y_independent/, docs/verification_ledger.md, docs/SI_USAGE.md | TO CHECK | TO CHECK |\n')
with (p/'report.md').open('a') as f:
    f.write('\nThe terrain-specific contract checker passed for all 33 records (terrain_contract.json). Focused producer/schema/author-checker regression tests were also run (focused_tests.txt); they are supporting tests, not the independent numerical calculation. The repository-wide contract on unrelated products was not rerun in this sparse verification checkout.\n')
