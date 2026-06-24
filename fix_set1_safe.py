import re

fpath = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Reading/All Passages/All-Passages-Set1.html'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
original = content

# 1. Replace spammy console.log lines with empty lines (preserve structure)
# These are standalone console.log calls that can be safely removed
replacements = [
    # Navigation spam
    (r"\s+console\.log\(`🚀 Initializing application\.\.\.`\);", ""),
    (r"\s+console\.log\(`📋 Setting up initial state - switching to part 1`\);", ""),
    (r"\s+console\.log\(`🔀 switchToPart called with partNumber: \$\{partNumber\}, currentPassage: \$\{currentPassage\}`\);", ""),
    (r"\s+console\.log\(`✅ switchToPart completed - switched to part \$\{partNumber\}`\);", ""),
    (r"\s+console\.log\(`🖱️ Question container clicked - qNum: \$\{qNum\}, qEnd: \$\{qEnd\}, currentQuestion: \$\{currentQuestion\}, element:`\);", ""),
    (r"\s+console\.log\(`ℹ️ Container without valid question number, ignoring navigation`\);", ""),
    (r"\s+console\.log\(`🚀 Navigating from question \$\{currentQuestion\} to question \$\{qNum\}`\);", ""),
    (r"\s+console\.log\(`ℹ️ Already on question \$\{qNum\}, no navigation needed`\);", ""),
    (r"\s+console\.log\(`ℹ️ Ignoring click on group container \(\$\{qNum\}-\$\{qEnd\}\)`\);", ""),
    (r"\s+console\.log\(`🎯 Individual question element clicked - qNum: \$\{qNum\}, currentQuestion: \$\{currentQuestion\}, element:`\);", ""),
    (r"\s+console\.log\(`ℹ️ Container without specific question number, ignoring navigation`\);", ""),
    (r"\s+console\.log\(`🚀 Navigating from question \$\{currentQuestion\} to question \$\{qNum\} \(individual element\)`\);", ""),
    (r"\s+console\.log\(`ℹ️ Already on question \$\{qNum\}, no navigation needed \(individual element\)`\);", ""),
    (r"\s+console\.log\(`📝 Input element clicked - qNum: \$\{qNum\}, currentQuestion: \$\{currentQuestion\}, input:`\);", ""),
    (r"\s+console\.log\(`🚀 Navigating from question \$\{currentQuestion\} to question \$\{qNum\} \(input element\)`\);", ""),
    (r"\s+console\.log\(`ℹ️ Already on question \$\{qNum\}, no navigation needed \(input element\)`\);", ""),
    (r"\s+console\.log\(`📄 Summary paragraph clicked - qNum: \$\{qNum\}, currentQuestion: \$\{currentQuestion\}, paragraph:`\);", ""),
    (r"\s+console\.log\(`🚀 Navigating from question \$\{currentQuestion\} to question \$\{qNum\} \(summary paragraph\)`\);", ""),
    (r"\s+console\.log\(`ℹ️ Already on question \$\{qNum\}, no navigation needed \(summary paragraph\)`\);", ""),
    # goToQuestion spam
    (r"\s+console\.log\(`🎯 goToQuestion called with questionNumber: \$\{questionNumber\}, currentQuestion: \$\{currentQuestion\}, currentPassage: \$\{currentPassage\}`\);", ""),
    (r"\s+console\.log\(`📍 Calculated passageNumber: \$\{passageNumber\} for question \$\{questionNumber\}`\);", ""),
    (r"\s+console\.log\(`✅ Staying in same part \(\$\{passageNumber\}\) for question \$\{questionNumber\}`\);", ""),
    (r"\s+console\.log\(`🔍 Looking for target element with data-q-start=\"\$\{questionNumber\}\":`\);", ""),
    (r"\s+console\.log\(`✅ Found target element:`\);", ""),
    (r"\s+console\.log\(`📋 Added active-question class to question element`\);", ""),
    (r"\s+console\.log\(`🔄 updateNavigation called for currentQuestion: \$\{currentQuestion\}`\);", ""),
    (r"\s+console\.log\(`✅ Updated navigation - active nav button:`\);", ""),
    (r"\s+console\.log\(`⚠️ No direct input found for question \$\{currentQuestion\}, looking in question block`\);", ""),
    (r"\s+console\.log\(`✅ Focused on input in question block:`\);", ""),
    (r"\s+console\.log\(`✅ updateNavigation completed`\);", ""),
    (r"\s+console\.log\(`✅ goToQuestion completed for question \$\{questionNumber\}`\);", ""),
    # checkAnswers spam (drag and drop)
    (r"\s+console\.log\(`🔍 Checking drag-and-drop question \$\{i\}`\);", ""),
    (r"\s+console\.log\(`📍 Drop zone for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`📍 Dropped item for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`📍 Correct answer for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`✅ User answer for question \$\{i\}: \"\$\{userAnswer\}\", Correct: \"\$\{correctAnswer\}\", IsCorrect: \$\{isCorrect\}`\);", ""),
    (r"\s+console\.log\(`🎉 Question \$\{i\} is correct! Score: \$\{score\}`\);", ""),
    (r"\s+console\.log\(`❌ Question \$\{i\} is incorrect\. Expected: \"\$\{correctAnswer\}\", Got: \"\$\{userAnswer\}\"`\);", ""),
    (r"\s+console\.log\(`⚠️ No answer provided for question \$\{i\}`\);", ""),
    # clickable cell spam
    (r"\s+console\.log\(`🔍 Checking clickable cell question \$\{i\}`\);", ""),
    (r"\s+console\.log\(`📍 Selected cell for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`📍 Correct answer for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`✅ User answer for question \$\{i\}: \"\$\{userAnswer\}\", Correct: \"\$\{correctAnswer\}\", IsCorrect: \$\{isCorrect\}`\);", ""),
    (r"\s+console\.log\(`🎉 Question \$\{i\} is correct! Score: \$\{score\}`\);", ""),
    (r"\s+console\.log\(`❌ Question \$\{i\} is incorrect\. Expected: \"\$\{correctAnswer\}\", Got: \"\$\{userAnswer\}\"`\);", ""),
    (r"\s+console\.log\(`⚠️ No answer provided for question \$\{i\}`\);", ""),
    (r"\s+console\.log\(`✅ Highlighted correct answer for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`⚠️ Could not find correct cell for question \$\{i\} with value \"\$\{correctAnswerText\}\"`\);", ""),
    # table matching spam
    (r"\s+console\.log\(`🔍 Checking table matching question \$\{i\}`\);", ""),
    (r"\s+console\.log\(`📍 Selected cell for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`📍 Correct answer for question \$\{i\}:`\);", ""),
    (r"\s+console\.log\(`✅ User answer for question \$\{i\}: \"\$\{userAnswer\}\", Correct: \"\$\{correctAnswer\}\", IsCorrect: \$\{isCorrect\}`\);", ""),
    (r"\s+console\.log\(`🎉 Question \$\{i\} is correct! Score: \$\{score\}`\);", ""),
    (r"\s+console\.log\(`❌ Question \$\{i\} is incorrect\. Expected: \"\$\{correctAnswer\}\", Got: \"\$\{userAnswer\}\"`\);", ""),
    (r"\s+console\.log\(`⚠️ No answer provided for question \$\{i\}`\);", ""),
]

for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# 2. Add autoSaveReadingScore after results-band is set
content = content.replace(
    "document.getElementById('results-band').textContent = calculateBandScore(score);",
    "document.getElementById('results-band').textContent = calculateBandScore(score);\n            window.autoSaveReadingScore(score, calculateBandScore(score));"
)

# 3. Fix the Finish & Go to Dashboard button
content = content.replace(
    'onclick="alert(\'Button clicked!\'); console.log(\'Button clicked, finishAndGoToDashboard exists:\', typeof finishAndGoToDashboard); finishAndGoToDashboard();"',
    'onclick="window.finishAndSave()"'
)

# 4. Add readingTestUtils.js script tag before </body>
if 'readingTestUtils.js' not in content:
    content = content.replace('</body>', '    <script src="../../js/readingTestUtils.js?v=1"></script>\n</body>')

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify braces are balanced
script_start = content.find('<script>')
script_end = content.find('</script>', script_start)
js = content[script_start:script_end]
open_braces = js.count('{')
close_braces = js.count('}')
print('Open braces: %d, Close braces: %d' % (open_braces, close_braces))
if open_braces == close_braces:
    print('✅ Braces are balanced!')
else:
    print('❌ Brace mismatch of %d!' % (open_braces - close_braces))
