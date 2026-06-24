#!/usr/bin/env python3
"""Patch all reading test HTML files to:
1. Expose calculateBand to window
2. Add 'Go to Dashboard' button in results modal
3. Add testTracker.js script
"""

import os
import re
import glob

base_dir = "/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Reading"

# Find all HTML files recursively
html_files = []
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith('.html'):
            html_files.append(os.path.join(root, f))

print(f"Found {len(html_files)} reading test HTML files")

for filepath in html_files:
    print(f"Processing: {os.path.relpath(filepath, base_dir)}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Add window.calculateBand = calculateBand after calculateBand function definition
    # Find the pattern: return (map[scaled] || 0.0).toFixed(1);\n        }\n\n        function showResultsModal
    pattern1 = r'(return \(map\[scaled\] \|\| 0\.0\)\.toFixed\(1\);\s*\n\s*\}\s*\n\s*\n\s*function showResultsModal)'
    replacement1 = r'return (map[scaled] || 0.0).toFixed(1);\n        }\n\n        window.calculateBand = calculateBand;\n\n        function showResultsModal'
    content = re.sub(pattern1, replacement1, content)
    
    if content != original:
        print(f"  -> Added window.calculateBand expose")
    
    # 2. Add Go to Dashboard button after results-summary div
    # Pattern: </div>\n            <div id="results-details"
    pattern2 = r'(</div>\s*\n\s*<div id="results-details" class="results-details-container">)'
    replacement2 = r'''            </div>
            <div class="results-actions" style="margin-top: 15px; text-align: center;">
                <button onclick="window.location.href='/dashboard.html'" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">Finish & Go to Dashboard</button>
            </div>
            <div id="results-details" class="results-details-container">'''
    content = re.sub(pattern2, replacement2, content)
    
    if content != original:
        print(f"  -> Added dashboard button")
    
    # 3. Add testTracker.js before readingScoreSaver.js if not present
    if 'testTracker.js' not in content and 'readingScoreSaver.js' in content:
        content = content.replace(
            '<script src="../../js/readingScoreSaver.js"></script>',
            '<script src="../../js/testTracker.js"></script>\n    <script src="../../js/readingScoreSaver.js"></script>'
        )
        print(f"  -> Added testTracker.js")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  -> Saved changes")
    else:
        print(f"  -> No changes needed (or already patched)")

print("Done!")
