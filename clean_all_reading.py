import os, re

base = '/var/www/ieltspractice/Tests/practice/Reading'
updated = 0
errors = []

# Spam patterns to remove (these are standalone logs that don't affect control flow)
spam_patterns = [
    # Navigation
    r'\s+console\.log\(`🚀 Initializing application\.\.\.`\);',
    r'\s+console\.log\(`📋 Setting up initial state - switching to part 1`\);',
    r'\s+console\.log\(`🔀 switchToPart called with partNumber: [^`]+`\);',
    r'\s+console\.log\(`✅ switchToPart completed - switched to part [^`]+`\);',
    r'\s+console\.log\(`🖱️ Question container clicked - qNum: [^`]+element:`\);',
    r'\s+console\.log\(`ℹ️ Container without valid question number, ignoring navigation`\);',
    r'\s+console\.log\(`ℹ️ Container without specific question number, ignoring navigation`\);',
    r'\s+console\.log\(`🚀 Navigating from question [^`]+`\);',
    r'\s+console\.log\(`🚀 Navigating from question [^`]+\(individual element\)`\);',
    r'\s+console\.log\(`🚀 Navigating from question [^`]+\(input element\)`\);',
    r'\s+console\.log\(`🚀 Navigating from question [^`]+\(summary paragraph\)`\);',
    r'\s+console\.log\(`ℹ️ Already on question [^`]+no navigation needed`\);',
    r'\s+console\.log\(`ℹ️ Already on question [^`]+no navigation needed \(individual element\)`\);',
    r'\s+console\.log\(`ℹ️ Already on question [^`]+no navigation needed \(input element\)`\);',
    r'\s+console\.log\(`ℹ️ Already on question [^`]+no navigation needed \(summary paragraph\)`\);',
    r'\s+console\.log\(`ℹ️ Ignoring click on group container \([^`]+\)`\);',
    r'\s+console\.log\(`🎯 Individual question element clicked - qNum: [^`]+element:`\);',
    r'\s+console\.log\(`📝 Input element clicked - qNum: [^`]+input:`\);',
    r'\s+console\.log\(`📄 Summary paragraph clicked - qNum: [^`]+paragraph:`\);',
    # goToQuestion
    r'\s+console\.log\(`🎯 goToQuestion called with questionNumber: [^`]+`\);',
    r'\s+console\.log\(`📍 Calculated passageNumber: [^`]+`\);',
    r'\s+console\.log\(`✅ Staying in same part \([^`]+\) for question [^`]+`\);',
    r'\s+console\.log\(`🔍 Looking for target element with data-q-start=[^`]+`\);',
    r'\s+console\.log\(`✅ Found target element:`\);',
    r'\s+console\.log\(`📋 Added active-question class to question element`\);',
    r'\s+console\.log\(`🔄 updateNavigation called for currentQuestion: [^`]+`\);',
    r'\s+console\.log\(`✅ Updated navigation - active nav button:`\);',
    r'\s+console\.log\(`⚠️ No direct input found for question [^`]+looking in question block`\);',
    r'\s+console\.log\(`✅ Focused on input in question block:`\);',
    r'\s+console\.log\(`✅ updateNavigation completed`\);',
    r'\s+console\.log\(`✅ goToQuestion completed for question [^`]+`\);',
    # checkAnswers drag-drop
    r'\s+console\.log\(`🔍 Checking drag-and-drop question [^`]+`\);',
    r'\s+console\.log\(`🔍 Checking clickable cell question [^`]+`\);',
    r'\s+console\.log\(`🔍 Checking table matching question [^`]+`\);',
    r'\s+console\.log\(`📍 Drop zone for question [^`]+`\);',
    r'\s+console\.log\(`📍 Dropped item for question [^`]+`\);',
    r'\s+console\.log\(`📍 Correct answer for question [^`]+`\);',
    r'\s+console\.log\(`📍 Selected cell for question [^`]+`\);',
    r'\s+console\.log\(`✅ User answer for question [^`]+`\);',
    r'\s+console\.log\(`🎉 Question [^`]+is correct! Score: [^`]+`\);',
    r'\s+console\.log\(`❌ Question [^`]+is incorrect\. Expected:[^`]+`\);',
    r'\s+console\.log\(`⚠️ No answer provided for question [^`]+`\);',
    r'\s+console\.log\(`✅ Highlighted correct answer for question [^`]+`\);',
    r'\s+console\.log\(`⚠️ Could not find correct cell for question [^`]+`\);',
    r'\s+console\.log\(`📝 Summary container clicked - target: [^`]+`\);',
    r'\s+console\.log\(`📚 Summary input element clicked - target: [^`]+`\);',
    # Other generic spam
    r"\s+console\.log\('selectCell called:', [^)]+\);",
    r"\s+console\.log\('Cell selected:', [^)]+\);",
]

for root_dir, dirs, files in os.walk(base):
    for fname in files:
        if not fname.endswith('.html'):
            continue
        if fname == 'All-Passages-Set1.html':
            continue  # Already done
        fpath = os.path.join(root_dir, fname)
        try:
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            errors.append('Read error %s: %s' % (fpath, e))
            continue
        
        original = content
        
        for pattern in spam_patterns:
            content = re.sub(pattern, '', content)
        
        if content != original:
            # Verify braces balance
            script_start = content.find('<script>')
            script_end = content.find('</script>', script_start)
            if script_start > 0 and script_end > script_start:
                js = content[script_start:script_end]
                open_b = js.count('{')
                close_b = js.count('}')
                if open_b != close_b:
                    errors.append('Brace mismatch %s: %d vs %d' % (fpath, open_b, close_b))
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
