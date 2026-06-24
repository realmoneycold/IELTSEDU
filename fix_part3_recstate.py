#!/usr/bin/env python3
"""
Fix recState scope in all Part 3 files - expose to window so AI functions can access it.
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
    """Fix recState references in a Part 3 file"""
    content = read_file(filepath)
    original = content
    
    # Check if already fixed
    if 'window.recState' in content:
        return False, "Already fixed"
    
    # Fix 1: Change const recState to window.recState
    content = content.replace(
        "const recState = {'p3': false};",
        "window.recState = {'p3': false}; // Expose globally for speech recognition"
    )
    
    # Fix 2: Change all recState references to window.recState inside the IIFE
    # We need to be careful to only replace the ones inside the IIFE, not in the AI functions
    
    # Replace recState.p3 with window.recState.p3
    content = content.replace('recState.p3)', 'window.recState.p3)')
    content = content.replace('recState[part]', 'window.recState[part]')
    
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
