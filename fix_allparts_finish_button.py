#!/usr/bin/env python3
"""
Fix Finish & Back to Dashboard button in all All-Parts files.
"""

import os
import glob

def read_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def write_file(filepath, content):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_file(filepath):
    """Fix finish button in an All-Parts file"""
    content = read_file(filepath)
    original = content
    changes = []
    
    # Fix the button text and onclick
    old_btn = '<button class="results-btn results-btn-primary" onclick="goToDashboard()">Go to Dashboard</button>'
    new_btn = '<button class="results-btn results-btn-primary" onclick="finishAndGoToDashboard()">Finish & Back to Dashboard</button>'
    
    if old_btn in content:
        content = content.replace(old_btn, new_btn)
        changes.append("Fixed button")
    
    # Also fix the shorter version if exists
    old_btn2 = 'onclick="goToDashboard()">Go to Dashboard</button>'
    new_btn2 = 'onclick="finishAndGoToDashboard()">Finish & Back to Dashboard</button>'
    
    if old_btn2 in content:
        content = content.replace(old_btn2, new_btn2)
        changes.append("Fixed button (short)")
    
    if content != original:
        write_file(filepath, content)
        return True, changes
    return False, changes

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/All Parts'
    
    files = sorted(glob.glob(os.path.join(base_dir, 'All-Parts-Set*.html')))
    
    fixed_count = 0
    for filepath in files:
        filename = os.path.basename(filepath)
        if 'Set1.html' in filename:
            print(f"Skipping {filename} (already fixed)")
            continue
        try:
            success, changes = fix_file(filepath)
            if success:
                print(f"✓ Fixed {filename}: {', '.join(changes)}")
                fixed_count += 1
            else:
                print(f"  - {filename}: No changes needed")
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
