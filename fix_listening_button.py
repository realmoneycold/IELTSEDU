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
        
        # Fix the button: remove modal-close-btn class, add finish-btn class, and use stronger inline styles
        old_btn = 'class="modal-close-btn" onclick="window.finishListeningAndSave()" style="margin-left:10px;background:#007bff;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;"'
        new_btn = 'class="finish-btn" onclick="window.finishListeningAndSave()" style="margin-left:auto;background:#007bff !important;color:#fff !important;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:15px !important;font-weight:600;"'
        content = content.replace(old_btn, new_btn)
        
        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            updated += 1
            print('Fixed: %s' % fname)

print('Done. Updated %d files.' % updated)
