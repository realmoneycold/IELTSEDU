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
        
        # 2. Fix button onclick patterns
        content = re.sub(
            r'onclick="[^"]*(?:location\.href|window\.location)[^"]*dashboard[^"]*"',
            'onclick="window.finishAndSave()"',
            content
        )
        
        # 3. Replace closeResultsModal with finishAndSave for files that don't have dashboard button
        if 'closeResultsModal()' in content and 'finishAndSave' not in content:
            content = re.sub(
                r'(<button[^>]*onclick=")closeResultsModal\(\)("[^>]*>)(Close|Close Results)(</button>)',
                r'\1window.finishAndSave()\2Finish & Go to Dashboard\4',
                content
            )
        
        # 4. Add autoSaveReadingScore after results-band assignment
        # Pattern A: calculateBandScore(score)
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*calculateBandScore\(score\);)",
            r"\1\n            window.autoSaveReadingScore(score, calculateBandScore(score));",
            content
        )
        # Pattern B: calculateBand(score)
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*calculateBand\(score\);)",
            r"\1\n            window.autoSaveReadingScore(score, calculateBand(score));",
            content
        )
        # Pattern C: getBand(score)
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*getBand\(score\);)",
            r"\1\n            window.autoSaveReadingScore(score, getBand(score));",
            content
        )
        # Pattern D: band variable (already computed)
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*band;)",
            r"\1\n            window.autoSaveReadingScore(score, band);",
            content
        )
        # Pattern E: `Estimated Band: ${band}`
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*`Estimated Band: \$\{[^}]+\}`;)",
            r"\1\n            window.autoSaveReadingScore(score, band);",
            content
        )
        # Pattern F: band.toFixed(1)
        content = re.sub(
            r"(document\.getElementById\('results-band'\)\.textContent\s*=\s*band\.toFixed\(1\);)",
            r"\1\n            window.autoSaveReadingScore(score, band.toFixed(1));",
            content
        )
        
        # 5. Remove ALL console.log/console.warn lines except essential ones
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
        
        # 6. Remove any remaining spam patterns that might not have been line-start matches
        spam_keywords = [
            'console.log(`🚀 Initializing', 'console.log(`📋 Setting up',
            'console.log(`🔀 switchToPart', 'console.log(`✅ switchToPart',
            'console.log(`🖱️ Question container', 'console.log(`🎯 Individual',
            'console.log(`📝 Input element', 'console.log(`📄 Summary paragraph',
            'console.log(`🚀 Navigating', 'console.log(`ℹ️ Already on',
            'console.log(`ℹ️ Ignoring click', 'console.log(`ℹ️ Container without',
            'console.log(`🎯 goToQuestion', 'console.log(`📍 Calculated',
            'console.log(`✅ Staying in same', 'console.log(`🔍 Looking for',
            'console.log(`✅ Found target', 'console.log(`📋 Added active-question',
            'console.log(`🔄 updateNavigation', 'console.log(`✅ Updated navigation',
            'console.log(`⚠️ No direct input', 'console.log(`✅ Focused on input',
            'console.log(`✅ updateNavigation completed', 'console.log(`✅ goToQuestion completed',
            'console.log(`🔍 Checking drag-and-drop', 'console.log(`🔍 Checking clickable',
            'console.log(`🔍 Checking table', 'console.log(`📍 Drop zone',
            'console.log(`📍 Dropped item', 'console.log(`📍 Selected cell',
            'console.log(`📍 Correct answer', 'console.log(`✅ User answer',
            'console.log(`🎉 Question', 'console.log(`❌ Question',
            'console.log(`⚠️ No answer', 'console.log(`✅ Highlighted correct',
            'console.log(`⚠️ Could not find', "console.log('selectCell called:",
            "console.log('Cell selected:", 'console.log(`📝 Summary container',
            'console.log(`📚 Summary input',
        ]
        
        for kw in spam_keywords:
            content = content.replace(kw, '')
        
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

print('All done')
