import re

fpath = '/var/www/ieltspractice/Tests/practice/Reading/All Passages/All-Passages-Set1.html'
with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

lines = content.split('\n')
cleaned = []

spam_keywords = [
    'No input found in question block',
    'No question block found for question',
]

for line in lines:
    stripped = line.strip()
    if stripped.startswith('console.log('):
        if any(k in stripped for k in spam_keywords):
            continue
    cleaned.append(line)

content = '\n'.join(cleaned)

with open(fpath, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify braces
script_start = content.find('<script>')
script_end = content.find('</script>', script_start)
js = content[script_start:script_end]
print('Braces: %d / %d' % (js.count('{'), js.count('}')))

remaining = [l for l in content.split('\n') if 'console.log(' in l]
print('Remaining console.log: %d' % len(remaining))
for line in remaining:
    print('  %s' % line.strip()[:100])
