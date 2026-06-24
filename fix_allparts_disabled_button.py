#!/usr/bin/env python3
"""
Fix disabled 'Go to Part 2' button in all All-Parts files.
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
    """Fix disabled button in an All-Parts file"""
    content = read_file(filepath)
    original = content
    
    # Fix the disabled line
    content = content.replace(
        "document.getElementById('p1-next').disabled = (p1Current === P1_TOTAL);",
        "document.getElementById('p1-next').disabled = false; // Always enabled to allow going to Part 2"
    )
    
    if content != original:
        write_file(filepath, content)
        return True, "Fixed disabled button"
    return False, "No changes needed"

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
