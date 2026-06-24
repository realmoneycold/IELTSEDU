import re

fpath = '/var/www/ieltspractice/Tests/practice/Reading/All Passages/All-Passages-Set1.html'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

lines = content.split('\n')
cleaned = []

spam_keywords = [
    'Question container clicked',
    'Individual question element clicked',
    'Input element clicked',
    'Summary paragraph clicked',
    'Summary container clicked',
    'Summary input element clicked',
    'Navigating from question',
    'Already on question',
    'Ignoring click on group',
    'Container without',
    'goToQuestion called',
    'Calculated passageNumber',
    'Staying in same part',
    'Looking for target element',
    'Found target element',
    'Added active-question class',
    'updateNavigation called',
    'Updated navigation',
    'No direct input found',
    'Focused on input in question',
    'updateNavigation completed',
    'goToQuestion completed',
    'Checking drag-and-drop',
    'Checking clickable cell',
    'Checking table matching',
    'Drop zone for question',
    'Dropped item for question',
    'Selected cell for question',
    'Correct answer for question',
    'User answer for question',
    'is correct! Score',
    'is incorrect. Expected',
    'No answer provided for question',
    'Highlighted correct answer',
    'Could not find correct cell',
    'selectCell called',
    'Cell selected',
    'Initializing application',
    'Setting up initial state',
    'switchToPart called',
    'switchToPart completed',
]

kept_keywords = [
    'Final score',
    'CHECK ANSWERS COMPLETE',
    '[CheckAnswers] Saved score',
    '[Debug] Setting window.score',
    '[ReadingSaver]',
    '[Reading Test] Final Score',
]

for line in lines:
    stripped = line.strip()
    if stripped.startswith('console.log('):
        # Check if it's a useful log we want to keep
        if any(k in stripped for k in kept_keywords):
            cleaned.append(line)
            continue
        # Check if it's spam
        if any(k in stripped for k in spam_keywords):
            continue  # Remove spam
        # If neither, keep it (might be something else useful)
        cleaned.append(line)
    else:
        cleaned.append(line)

content = '\n'.join(cleaned)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    verify = f.read()
remaining = [l for l in verify.split('\n') if 'console.log(' in l]
print('Remaining console.log lines: %d' % len(remaining))
for line in remaining:
    print('  %s' % line.strip()[:100])
