import os

base = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Listening'
updated = 0

for root_dir, dirs, files in os.walk(base):
    for fname in sorted(files):
        if not fname.endswith('.html'):
            continue
        fpath = os.path.join(root_dir, fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Skip if already has the button
        if 'Finish & Go to Dashboard' in content:
            continue
        
        # Skip if no result-details div (not a listening test with modal)
        if 'id="result-details"' not in content:
            continue
        
        # Add listeningTestUtils.js if missing
        if 'listeningTestUtils.js' not in content:
            depth = fpath.count('Listening/')
            if depth > 0:
                rel_path = '../../js/listeningTestUtils.js?v=1'
            else:
                rel_path = '../js/listeningTestUtils.js?v=1'
            content = content.replace('</body>', '    <script src="%s"></script>\n</body>' % rel_path)
        
        # Add button inside modal-body after result-details
        # Try different indentation patterns
        patterns = [
            '                <div id="result-details"></div>\n                </div>',
            '                <div id="result-details"></div>\n            </div>',
            '                    <div id="result-details"></div>\n                </div>',
        ]
        
        button_html = '''                <div id="result-details"></div>
                <div style="text-align:center;margin-top:20px;">
                    <button onclick="window.finishListeningAndSave()" style="background:#007bff;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600;">Finish & Go to Dashboard</button>
                </div>
                </div>'''
        
        found = False
        for pat in patterns:
            if pat in content:
                content = content.replace(pat, button_html)
                found = True
                break
        
        if not found:
            # Try regex pattern with flexible whitespace
            import re
            regex = r'([\s]*<div id="result-details"></div>\s*)([\s]*</div>)'
            match = re.search(regex, content)
            if match:
                indent = match.group(2).replace('</div>', '')
                replacement = match.group(1) + '\n' + indent + '<div style="text-align:center;margin-top:20px;">\n' + indent + '    <button onclick="window.finishListeningAndSave()" style="background:#007bff;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600;">Finish & Go to Dashboard</button>\n' + indent + '</div>\n' + match.group(2)
                content = content[:match.start()] + replacement + content[match.end():]
                found = True
        
        if found:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            updated += 1
            print('Fixed: %s' % fname)
        else:
            print('Could not fix: %s' % fname)

print('Done. Updated %d files.' % updated)
