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
        
        # 1. Add readingTestUtils.js if missing
        if 'readingTestUtils.js' not in content:
            content = content.replace('</body>', '    <script src="../../js/readingTestUtils.js?v=1"></script>\n</body>')
        
        # 2. Fix "Finish & Go to Dashboard" button
        content = re.sub(
            r'onclick="[^"]*(?:location\.href|window\.location)[^"]*dashboard[^"]*"',
            'onclick="window.finishAndSave()"',
            content
        )
        
        # 3. For files with just "Close" button in results modal, change to "Close & Go to Dashboard"
        # These are Reading Part files that don't have the full results modal
        if 'closeResultsModal()' in content and 'finishAndSave' not in content:
            # Replace close button with save + redirect
            content = re.sub(
                r'(<button[^>]*onclick=")closeResultsModal\(\)("[^>]*>)(Close|Close Results)(</button>)',
                r'\1window.finishAndSave()\2Finish & Go to Dashboard\4',
                content
            )
        
        # 4. Add autoSaveReadingScore after results-band (flexible whitespace)
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*calculateBandScore\(score\);)",
            r"\1\n            window.autoSaveReadingScore(score, calculateBandScore(score));",
            content
        )
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
        
        # 5. Remove ALL console.log lines except essential ones
        lines = content.split('\n')
        cleaned = []
        keep_keywords = ['Final score', 'CHECK ANSWERS COMPLETE', 'Saved score', 'window.score', '[ReadingSaver]', '[Reading Test] Final Score']
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('console.log(') or stripped.startswith('console.warn('):
                if any(k in stripped for k in keep_keywords):
                    cleaned.append(line)
                else:
                    continue
            else:
                cleaned.append(line)
        
        content = '\n'.join(cleaned)
        
        # 6. Remove any remaining spam patterns
        spam_patterns = [
            r'\s+console\.log\(`🚀 Initializing[^`]*`;',
            r'\s+console\.log\(`📋 Setting up[^`]*`;',
            r'\s+console\.log\(`🔀 switchToPart[^`]*`;',
            r'\s+console\.log\(`✅ switchToPart[^`]*`;',
            r'\s+console\.log\(`🖱️ Question container[^`]*`;',
            r'\s+console\.log\(`🎯 Individual question[^`]*`;',
            r'\s+console\.log\(`📝 Input element[^`]*`;',
            r'\s+console\.log\(`📄 Summary paragraph[^`]*`;',
            r'\s+console\.log\(`🚀 Navigating[^`]*`;',
            r'\s+console\.log\(`ℹ️ Already on question[^`]*`;',
            r'\s+console\.log\(`ℹ️ Ignoring click[^`]*`;',
            r'\s+console\.log\(`ℹ️ Container without[^`]*`;',
            r'\s+console\.log\(`🎯 goToQuestion[^`]*`;',
            r'\s+console\.log\(`📍 Calculated passageNumber[^`]*`;',
            r'\s+console\.log\(`✅ Staying in same part[^`]*`;',
            r'\s+console\.log\(`🔍 Looking for target[^`]*`;',
            r'\s+console\.log\(`✅ Found target element[^`]*`;',
            r'\s+console\.log\(`📋 Added active-question[^`]*`;',
            r'\s+console\.log\(`🔄 updateNavigation[^`]*`;',
            r'\s+console\.log\(`✅ Updated navigation[^`]*`;',
            r'\s+console\.log\(`⚠️ No direct input[^`]*`;',
            r'\s+console\.log\(`✅ Focused on input[^`]*`;',
            r'\s+console\.log\(`✅ updateNavigation completed[^`]*`;',
            r'\s+console\.log\(`✅ goToQuestion completed[^`]*`;',
            r'\s+console\.log\(`🔍 Checking drag-and-drop[^`]*`;',
            r'\s+console\.log\(`🔍 Checking clickable[^`]*`;',
            r'\s+console\.log\(`🔍 Checking table[^`]*`;',
            r'\s+console\.log\(`📍 Drop zone[^`]*`;',
            r'\s+console\.log\(`📍 Dropped item[^`]*`;',
            r'\s+console\.log\(`📍 Selected cell[^`]*`;',
            r'\s+console\.log\(`📍 Correct answer[^`]*`;',
            r'\s+console\.log\(`✅ User answer[^`]*`;',
            r'\s+console\.log\(`🎉 Question [^`]*correct![^`]*`;',
            r'\s+console\.log\(`❌ Question [^`]*incorrect\.[^`]*`;',
            r'\s+console\.log\(`⚠️ No answer provided[^`]*`;',
            r'\s+console\.log\(`✅ Highlighted correct[^`]*`;',
            r'\s+console\.log\(`⚠️ Could not find correct[^`]*`;',
            r"\s+console\.log\('selectCell called:',[^)]+\);",
            r"\s+console\.log\('Cell selected:',[^)]+\);",
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
                    print('SKIP %s: brace mismatch %d vs %d' % (fname, open_b, close_b))
                    continue
            
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print('Fixed: %s' % fname)

print('Done')
