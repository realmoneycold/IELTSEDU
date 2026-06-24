import os, re

base = '/var/www/ieltspractice/Tests/practice/Reading'

for root_dir, dirs, files in os.walk(base):
    for fname in sorted(files):
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root_dir, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        original = content
        
        # Fix button with more flexible regex
        content = re.sub(
            r'onclick="[^"]*(?:location\.href|window\.location)[^"]*dashboard[^"]*"',
            'onclick="window.finishAndSave()"',
            content
        )
        
        # Fix band assignment with flexible whitespace
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*calculateBand\(score\);)",
            r"\1\n            window.autoSaveReadingScore(score, calculateBand(score));",
            content
        )
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*getBand\(score\);)",
            r"\1\n            window.autoSaveReadingScore(score, getBand(score));",
            content
        )
        
        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print('Fixed: %s' % fname)

print('Done')
