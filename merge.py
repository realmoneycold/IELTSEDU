import re

with open('education-centre.html', 'r', encoding='utf-8') as f:
    old_html = f.read()

with open('education-dashboard.html', 'r', encoding='utf-8') as f:
    new_html = f.read()

# The script block in old_html
old_script_match = re.search(r'<script>(.*?)</script>', old_html, re.DOTALL)
old_script = old_script_match.group(1)

# The script block in new_html
new_script_match = re.search(r'<script>(.*?)</script>', new_html, re.DOTALL)
new_script = new_script_match.group(1)

# We want to extract auth/API functions from old_script:
auth_api = re.search(r'(const API_BASE_URL =.*?)(// ─── DATA ────|// Data)', old_script, re.DOTALL).group(1)

# Extract loadCentreData
load_centre_data = re.search(r'(async function loadCentreData\(\) \{.*?\}\n)', old_script, re.DOTALL).group(1)

# Extract new render functions
render_mocks = re.search(r'(function renderMocks\(\) \{.*?\n        \})', new_script, re.DOTALL)
if render_mocks: render_mocks = render_mocks.group(1)

render_score_table = re.search(r'(function renderScoreTable\(filter\) \{.*?\n        \})', new_script, re.DOTALL)
if render_score_table: render_score_table = render_score_table.group(1)

render_band_chart = re.search(r'(function renderBandChart\(\) \{.*?\n        \})', new_script, re.DOTALL)
if render_band_chart: render_band_chart = render_band_chart.group(1)

render_groups = re.search(r'(function renderGroups\(filter\) \{.*?\n        \})', new_script, re.DOTALL)
if render_groups: render_groups = render_groups.group(1)

render_applications = re.search(r'(function renderApplications\(\) \{.*?\n        \})', new_script, re.DOTALL)
if render_applications: render_applications = render_applications.group(1)

# print extracted for debugging
print(f"Got auth_api length: {len(auth_api)}")
print(f"Got loadCentreData: {len(load_centre_data)}")
if render_mocks: print("Got new renderMocks")
if render_score_table: print("Got new renderScoreTable")
if render_band_chart: print("Got new renderBandChart")
if render_groups: print("Got new renderGroups")
if render_applications: print("Got new renderApplications")

