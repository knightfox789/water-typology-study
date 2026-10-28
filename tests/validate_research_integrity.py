#!/usr/bin/env python3
"""Read-only consistency checks for the published research data."""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "explorer.html").read_text(encoding="utf-8")
match = re.search(r"<script>window\.__DATA__=(.*?)</script>", HTML, re.DOTALL)
assert match, "Embedded district dataset is missing"
embedded = json.loads(match.group(1).strip().removesuffix(";"))

files = {
    "geo": "districts.geojson", "att": "districts.json",
    "ind": "indicators.json", "agr": "agriculture.json",
    "gw": "groundwater.json", "whs": "structures.json",
    "rec": "recommendations.json", "add": "crop_additions.json",
    "gt": "ground_truth.json", "farm": "farm.json",
}
for name, filename in files.items():
    disk = json.loads((ROOT / "data" / filename).read_text(encoding="utf-8"))
    if name == "geo":
        # The embedded geography additionally contains provenance metadata.
        assert embedded["geo"]["features"] == disk["features"], "GeoJSON features differ"
        assert embedded["geo"]["type"] == disk["type"], "GeoJSON type differs"
    else:
        assert embedded[name] == disk, f"Embedded data differ: {filename}"

districts = embedded["att"]["districts"]
ids = {int(d["id"]) for d in districts}
assert len(districts) == len(ids) == 33, "Expected 33 distinct districts"
assert len(embedded["geo"]["features"]) == 33, "Expected 33 district geometries"
regions = {d["region_code"] for d in districts}
assert len(regions) == 7, "Expected seven regional codes"
assert {f["properties"]["id"] for f in embedded["geo"]["features"]} == ids
for term, district_id in embedded["att"]["search"]:
    assert term.strip() and district_id in ids, "Invalid search index entry"
assert len({term for term, _ in embedded["att"]["search"]}) == len(embedded["att"]["search"])

for name in ("ind", "agr", "gw", "whs", "rec", "add", "farm"):
    assert set(embedded[name]["districts"]) == {str(i) for i in ids}, f"Missing district data: {name}"

def near(actual, expected, margin, note):
    assert math.isfinite(actual) and math.isfinite(expected)
    assert abs(actual - expected) <= margin, f"{note}: {actual} != {expected}"

for d in districts:
    ident, name = str(d["id"]), d["name"]
    i = embedded["ind"]["districts"][ident]
    a = embedded["agr"]["districts"][ident]
    near(i["ideal_demand_mcm"],
         i["agri_mcm"] + i["livestock_mcm"] + i["domestic_mcm"] + i["industrial_mcm"],
         0.15, name + " ideal demand")
    near(i["revised_demand_mcm"],
         i["revised_agri_mcm"] + i["livestock_mcm"] + i["domestic_mcm"] + i["industrial_mcm"],
         0.15, name + " revised demand")
    for kind in ("ideal", "revised"):
        near(i[kind + "_gap_mcm"], i[kind + "_demand_mcm"] - i["supply_mcm"],
             0.15, name + " " + kind + " gap")
        near(i[kind + "_gap_pct"], 100 * i[kind + "_gap_mcm"] / i["supply_mcm"],
             0.065, name + " " + kind + " gap percentage")
    assert sum(a["sources_ha"].values()) == a["gia_ha"], name + " irrigated source areas"
    # Preserve the study archive's existing whole-percent truncation convention.
    assert a["irrigated_share_pct"] == math.floor(100 * a["gia_ha"] / a["gca_ha"]), name + " irrigated share"

print("PASS: 33 districts, seven regions, 10 embedded datasets and water-balance checks")
