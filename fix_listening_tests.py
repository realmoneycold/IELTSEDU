import os, re

base = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Listening'
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
        
        # 1. Add listeningTestUtils.js script tag before </body> if not present
        if 'listeningTestUtils.js' not in content:
            # Determine relative path depth
            depth = fpath.count('Listening/')
            if depth > 0:
                rel_path = '../../js/listeningTestUtils.js?v=1'
            else:
                rel_path = '../js/listeningTestUtils.js?v=1'
            content = content.replace('</body>', '    <script src="%s"></script>\n</body>' % rel_path)
        
        # 2. Add "Finish & Go to Dashboard" button to result modal
        # Find the modal close button and add a new button after it
        if 'finishListeningAndSave' not in content:
            # Pattern: close button inside modal-header
            content = content.replace(
                '<button id="modal-close-button" class="modal-close-btn">&times;</button>',
                '<button id="modal-close-button" class="modal-close-btn">&times;</button>\n                <button class="modal-close-btn" onclick="window.finishListeningAndSave()" style="margin-left:10px;background:#007bff;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">Finish & Go to Dashboard</button>'
            )
            # Also try pattern with modal-close-btn class
            if 'finishListeningAndSave' not in content:
                content = re.sub(
                    r'(<div class="modal-header">\s*<h2>[^<]*</h2>\s*<button[^>]*modal-close[^>]*>[^<]*</button>)',
                    r'\1\n                <button class="modal-close-btn" onclick="window.finishListeningAndSave()" style="margin-left:10px;background:#007bff;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;">Finish & Go to Dashboard</button>',
                    content
                )
        
        # 3. Add autoSaveListeningScore after score is set in checkAnswers
        # Find: scoreSummary.textContent = `You scored ${score} out of 40 (Band ${band}).`;
        content = content.replace(
            "scoreSummary.textContent = `You scored ${score} out of 40 (Band ${band}).`;",
            "scoreSummary.textContent = `You scored ${score} out of 40 (Band ${band}).`;\n            window.autoSaveListeningScore(score, band);"
        )
        
        # Also try without template literal
        content = re.sub(
            r"(scoreSummary\.textContent\s*=\s*['\"])You scored ['\"]\s*\+\s*score\s*\+\s*['\"] out of 40 \(Band ['\"]\s*\+\s*band\s*\+\s*['\"]\)\.['\"];?",
            r"\1You scored ' + score + ' out of 40 (Band ' + band + ').';\n            window.autoSaveListeningScore(score, band);",
            content
        )
        
        # 4. Remove spam console logs (keep essential ones)
        lines = content.split('\n')
        cleaned = []
        keep_keywords = ['ScoreCalc', '[ListeningUtils]', 'CHECK ANSWERS COMPLETE', 'Final score', 'Saved score']
        
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
        
        # 5. Remove remaining spam patterns
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
            'console.log("[ScoreCalc] Score summary text:', 
            'console.log("[ScoreCalc] Extracted score using pattern:',
            'console.log("[ScoreCalc] Saving test with score:',
            'console.log("[ScoreCalc] Score saved successfully!"',
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
