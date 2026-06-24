import os, re

base = '/var/www/ieltspractice/Tests/practice/Reading'
updated = 0

for root, dirs, files in os.walk(base):
    for fname in files:
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        original = content

        # Add console.log after results-score is set
        # Match various patterns like:
        # document.getElementById('results-score').textContent = score;
        # document.getElementById('results-score').textContent = `${score} / ${TOTAL_QUESTIONS}`;
        content = re.sub(
            r"(document\.getElementById\(['\"]results-score['\"]\)\.textContent\s*=\s*[^;]+;)\n",
            r"\1\n            console.log('[Reading Test] Final Score:', score);\n",
            content
        )

        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            updated += 1
            print('Updated: %s' % fpath)

print('\nDone. Updated %d files.' % updated)
