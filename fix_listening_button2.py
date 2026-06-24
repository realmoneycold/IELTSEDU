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
        
        original = content
        
        # Remove the button from the modal header (various patterns)
        content = content.replace(
            '<button id="modal-close-button" class="modal-close-btn">&times;</button>\n                <button class="finish-btn" onclick="window.finishListeningAndSave()" style="margin-left:auto;background:#007bff !important;color:#fff !important;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:15px !important;font-weight:600;">Finish & Go to Dashboard</button>',
            '<button id="modal-close-button" class="modal-close-btn">&times;</button>'
        )
        
        # Also try removing just the finish button if it's still in header
        content = content.replace(
            '                <button class="finish-btn" onclick="window.finishListeningAndSave()" style="margin-left:auto;background:#007bff !important;color:#fff !important;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:15px !important;font-weight:600;">Finish & Go to Dashboard</button>',
            ''
        )
        
        # Add the button to the modal body (after result-details)
        if 'Finish & Go to Dashboard' not in content:
            content = content.replace(
                '            <div class="modal-body">\n                <p id="score-summary"></p>\n                <div id="result-details"></div>\n            </div>',
                '            <div class="modal-body">\n                <p id="score-summary"></p>\n                <div id="result-details"></div>\n                <div style="text-align:center;margin-top:20px;">\n                    <button onclick="window.finishListeningAndSave()" style="background:#007bff;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:600;">Finish & Go to Dashboard</button>\n                </div>\n            </div>'
            )
        
        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            updated += 1
            print('Fixed: %s' % fname)

print('Done. Updated %d files.' % updated)
