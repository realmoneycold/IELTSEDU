import os, re

base = "/var/www/ieltspractice/Tests/practice/Reading"
updated = 0
errors = []

for root, dirs, files in os.walk(base):
    for fname in files:
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            errors.append("Read error %s: %s" % (fpath, e))
            continue
        
        original = content
        
        # 1. Add readingTestUtils.js script tag before </body>
        if 'readingTestUtils.js' not in content:
            content = content.replace('</body>', '    <script src="../../js/readingTestUtils.js?v=1"></script>\n</body>')
        
        # 2. Replace button onclick to call finishAndSave()
        content = content.replace('onclick="window.location.href=\'/dashboard.html\'"', 'onclick="window.finishAndSave()"')
        
        # 3a. Add score saving after calculateBandScore(score)
        content = content.replace(
            "document.getElementById('results-band').textContent = calculateBandScore(score);",
            "document.getElementById('results-band').textContent = calculateBandScore(score);\n            window.autoSaveReadingScore(score, calculateBandScore(score));"
        )
        
        # 3b. Add score saving after calculateBand(score) (alternative function name)
        content = content.replace(
            "document.getElementById('results-band').textContent = calculateBand(score);",
            "document.getElementById('results-band').textContent = calculateBand(score);\n            window.autoSaveReadingScore(score, calculateBand(score));"
        )
        
        # 4. Remove noisy console.log lines with emoji/question keywords
        patterns = [
            r'^\s*console\.log\([`\'"].*question.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Drop zone.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Selected cell.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Correct answer.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*User answer.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*No answer provided.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Highlighted correct.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Could not find.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Navigating from.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Already on question.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Container without.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Ignoring click.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Input element clicked.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Summary paragraph clicked.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Individual question element.*\);\s*\n',
            r'^\s*console\.log\([`\'"].*Question container clicked.*\);\s*\n',
        ]
        
        for pattern in patterns:
            content = re.sub(pattern, '', content, flags=re.MULTILINE | re.IGNORECASE)
        
        if content != original:
            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(content)
                updated += 1
                print("Updated: %s" % fpath)
            except Exception as e:
                errors.append("Write error %s: %s" % (fpath, e))

print("\nDone. Updated %d files." % updated)
if errors:
    print("Errors: %d" % len(errors))
    for err in errors[:5]:
        print("  %s" % err)
