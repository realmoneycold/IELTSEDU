#!/usr/bin/env python3
"""
Fix saveTestCompletion infinite recursion in all Part 3 files.
Rename local function to saveTestCompletionLocal.
"""

import os
import glob
import re

def read_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def write_file(filepath, content):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_file(filepath):
    """Fix saveTestCompletion recursion in a Part 3 file"""
    content = read_file(filepath)
    original = content
    
    # Check if already fixed
    if 'saveTestCompletionLocal' in content:
        return False, "Already fixed"
    
    # Fix 1: Rename local function definition
    content = content.replace(
        'async function saveTestCompletion() {',
        'async function saveTestCompletionLocal() {'
    )
    
    # Fix 2: Update the call in finishTestWithAI
    # Pattern: await saveTestCompletion();
    content = re.sub(
        r'await saveTestCompletion\(\);',
        'await saveTestCompletionLocal();',
        content
    )
    
    if content != original:
        write_file(filepath, content)
        return True, "Fixed"
    return False, "No changes needed"

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/Part 3'
    
    files = sorted(glob.glob(os.path.join(base_dir, 'Speaking-Part3-Set*.html')))
    
    fixed_count = 0
    for filepath in files:
        filename = os.path.basename(filepath)
        if 'Set1.html' in filename:
            print(f"Skipping {filename} (already fixed)")
            continue
        try:
            success, msg = fix_file(filepath)
            if success:
                print(f"✓ Fixed {filename}")
                fixed_count += 1
            else:
                print(f"  - {filename}: {msg}")
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
