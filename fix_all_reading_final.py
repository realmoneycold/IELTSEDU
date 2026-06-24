import os, re

base = '/var/www/ieltspractice/Tests/practice/Reading'
updated = 0
errors = []

for root_dir, dirs, files in os.walk(base):
    for fname in sorted(files):
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root_dir, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            errors.append('Read error %s: %s' % (fpath, e))
            continue
        
        original = content
        
        # 1. Add readingTestUtils.js before </body> if not present
        if 'readingTestUtils.js' not in content:
            content = content.replace('</body>', '    <script src="../../js/readingTestUtils.js?v=1"></script>\n</body>')
        
        # 2. Replace button onclick to call finishAndSave()
        content = content.replace('onclick="window.location.href=\'/dashboard.html\'"', 'onclick="window.finishAndSave()"')
        # Also handle other variations
        content = re.sub(r'onclick="[^"]*location\.href[^"]*dashboard[^"]*"', 'onclick="window.finishAndSave()"', content)
        
        # 3. Add autoSaveReadingScore after results-band is set (multiple patterns)
        # Pattern A: calculateBandScore(score)
        content = content.replace(
            "document.getElementById('results-band').textContent = calculateBandScore(score);",
            "document.getElementById('results-band').textContent = calculateBandScore(score);\n            window.autoSaveReadingScore(score, calculateBandScore(score));"
        )
        # Pattern B: calculateBand(score)
        content = content.replace(
            "document.getElementById('results-band').textContent = calculateBand(score);",
            "document.getElementById('results-band').textContent = calculateBand(score);\n            window.autoSaveReadingScore(score, calculateBand(score));"
        )
        # Pattern C: getBand(score)
        content = content.replace(
            "document.getElementById('results-band').textContent = getBand(score);",
            "document.getElementById('results-band').textContent = getBand(score);\n            window.autoSaveReadingScore(score, getBand(score));"
        )
        # Pattern D: getBandFromScore
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*`Estimated Band: \$\{[^}]+\}`;)",
            r"\1\n            window.autoSaveReadingScore(score, band);",
            content
        )
        # Pattern E: band.toFixed(1)
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*band\.toFixed\(1\);)",
            r"\1\n            window.autoSaveReadingScore(score, band.toFixed(1));",
            content
        )
        
        # 4. Remove ALL console.log lines except essential ones
        lines = content.split('\n')
        cleaned = []
        keep_keywords = ['Final score', 'CHECK ANSWERS COMPLETE', 'Saved score', 'window.score', '[ReadingSaver]', '[Reading Test] Final Score']
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('console.log('):
                if any(k in stripped for k in keep_keywords):
                    cleaned.append(line)
                else:
                    continue
            else:
                cleaned.append(line)
        
        content = '\n'.join(cleaned)
        
        # 5. Also remove specific spam patterns that might be multi-line
        spam_patterns = [
            r'\s+console\.log\(`🚀 Initializing application\.\.\.`;',
            r"\s+console\.log\('selectCell called:', [^)]+\);",
            r"\s+console\.log\('Cell selected:', [^)]+\);",
            r'\s+console\.log\(`🔍 Checking drag-and-drop[^`]*`;',
            r'\s+console\.log\(`📍 Drop zone[^`]*`;',
            r'\s+console\.log\(`📍 Dropped item[^`]*`;',
            r'\s+console\.log\(`📍 Correct answer[^`]*`;',
            r'\s+console\.log\(`✅ User answer[^`]*`;',
            r'\s+console\.log\(`🎉 Question [^`]*correct! Score:[^`]*`;',
            r'\s+console\.log\(`❌ Question [^`]*incorrect\. Expected:[^`]*`;',
            r'\s+console\.log\(`⚠️ No answer provided[^`]*`;',
            r'\s+console\.log\(`✅ Highlighted correct answer[^`]*`;',
            r'\s+console\.log\(`⚠️ Could not find correct cell[^`]*`;',
            r'\s+console\.log\(`🖱️ Question container clicked[^`]*`;',
            r'\s+console\.log\(`🎯 Individual question element clicked[^`]*`;',
            r'\s+console\.log\(`📝 Input element clicked[^`]*`;',
            r'\s+console\.log\(`📄 Summary paragraph clicked[^`]*`;',
            r'\s+console\.log\(`🚀 Navigating from question[^`]*`;',
            r'\s+console\.log\(`ℹ️ Already on question[^`]*`;',
            r'\s+console\.log\(`ℹ️ Ignoring click on group[^`]*`;',
            r'\s+console\.log\(`🎯 goToQuestion called[^`]*`;',
            r'\s+console\.log\(`📍 Calculated passageNumber[^`]*`;',
            r'\s+console\.log\(`✅ Staying in same part[^`]*`;',
            r'\s+console\.log\(`🔍 Looking for target element[^`]*`;',
            r'\s+console\.log\(`✅ Found target element[^`]*`;',
            r'\s+console\.log\(`📋 Added active-question class[^`]*`;',
            r'\s+console\.log\(`🔄 updateNavigation called[^`]*`;',
            r'\s+console\.log\(`✅ Updated navigation[^`]*`;',
            r'\s+console\.log\(`⚠️ No direct input found[^`]*`;',
            r'\s+console\.log\(`✅ Focused on input in question block[^`]*`;',
            r'\s+console\.log\(`✅ updateNavigation completed[^`]*`;',
            r'\s+console\.log\(`✅ goToQuestion completed[^`]*`;',
            r'\s+console\.log\(`🔀 switchToPart called[^`]*`;',
            r'\s+console\.log\(`✅ switchToPart completed[^`]*`;',
            r'\s+console\.log\(`📋 Setting up initial state[^`]*`;',
            r'\s+console\.log\(`📝 Summary container clicked[^`]*`;',
            r'\s+console\.log\(`📚 Summary input element clicked[^`]*`;',
        ]
        
        for pattern in spam_patterns:
            content = re.sub(pattern, '', content)
        
        if content != original:
            # Verify brace balance
            script_start = content.find('<script>')
            script_end = content.find('</script>', script_start)
            if script_start > 0 and script_end > script_start:
                js = content[script_start:script_end]
                open_b = js.count('{')
                close_b = js.count('}')
                if open_b != close_b:
                    errors.append('Brace mismatch %s: %d vs %d' % (fname, open_b, close_b))
                    continue
            
            try:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(content)
                updated += 1
            except Exception as e:
                errors.append('Write error %s: %s' % (fpath, e))

print('Done. Updated %d files.' % updated)
if errors:
    print('Errors: %d' % len(errors))
    for err in errors[:5]:
        print('  %s' % err)
