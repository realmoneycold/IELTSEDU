import re

fpath = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Reading/All Passages/All-Passages-Set1.html'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()
original = content

# Remove ALL console.log lines EXCEPT the final score ones
# We'll keep lines that contain "Final score" or "[Reading Test] Final Score" or "CHECK ANSWERS COMPLETE"
lines = content.split('\n')
cleaned = []
kept = 0
removed = 0

for line in lines:
    stripped = line.strip()
    if stripped.startswith('console.log('):
        # Keep only these useful logs
        if any(k in stripped for k in [
            'Final score',
            '[Reading Test] Final Score',
            'CHECK ANSWERS COMPLETE',
            '[CheckAnswers] Saved score',
            '[Debug] Setting window.score'
        ]):
            cleaned.append(line)
            kept += 1
        else:
            removed += 1
            continue
    else:
        cleaned.append(line)

content = '\n'.join(cleaned)

# Also remove the alert from the button
content = content.replace("alert('Button clicked!'); console.log('Button clicked, finishAndGoToDashboard exists:', typeof finishAndGoToDashboard); ", "")

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Removed %d console.log lines, kept %d' % (removed, kept))
