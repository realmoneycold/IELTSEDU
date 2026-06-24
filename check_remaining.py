import os, re

base = '/var/www/ieltspractice/Tests/practice/Reading'

for root_dir, dirs, files in os.walk(base):
    for fname in sorted(files):
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root_dir, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Check what type of button onclick exists
        btn_match = re.search(r'onclick="([^"]*)"[^>]*>Finish[^<]*</button>', content)
        if btn_match:
            onclick = btn_match.group(1)
            if 'finishAndSave' not in onclick:
                print('%s button: %s' % (fname, onclick[:80]))
        
        # Check what type of results-band assignment exists
        band_match = re.search(r"getElementById\('results-band'\)\.textContent\s*=\s*(.+?);", content)
        if band_match:
            band_expr = band_match.group(1).strip()
            if 'autoSave' not in content:
                print('%s band: %s' % (fname, band_expr[:80]))

print('---done---')
