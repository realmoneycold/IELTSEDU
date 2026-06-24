import os

fpath = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/Part 1/Speaking-Part1-Set1.html'

with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

original = content

# 1. Add speakingTestUtils.js before closing body tag
if 'speakingTestUtils.js' not in content:
    content = content.replace(
        '</body>',
        '    <script src="../../js/speakingTestUtils.js?v=1"></script>\n</body>'
    )

# 2. Replace the finish logic to use finishSpeakingTest instead of just redirecting
# Old pattern: confirm('Test complete!') then redirect
# New pattern: confirm then finishSpeakingTest then redirect

# Replace p1Next function finish logic
old_finish_logic = """else if(confirm('Test complete!')){
                        saveTestCompletion().then(() => {
                            window.location.href='../index.html';
                        });
                    }"""

new_finish_logic = """else if(confirm('Test complete!')){
                        saveTestCompletion().then(() => {
                            window.finishSpeakingTest();
                        });
                    }"""

content = content.replace(old_finish_logic, new_finish_logic)

if content != original:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed Speaking-Part1-Set1.html')
else:
    print('No changes made')
