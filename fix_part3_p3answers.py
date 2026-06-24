#!/usr/bin/env python3
"""
Add missing window.p3Answers initialization to all Part 3 files.
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
    """Add window.p3Answers initialization if missing"""
    content = read_file(filepath)
    original = content
    
    # Check if already fixed
    if 'window.p3Answers' in content:
        return False, "Already has window.p3Answers"
    
    # Add window.p3Answers after window.recState
    content = content.replace(
        "window.recState = {'p3': false}; // Expose globally for speech recognition",
        "window.recState = {'p3': false}; // Expose globally for speech recognition\n        window.p3Answers = {}; // Initialize answers storage"
    )
    
    # Also fix the old pattern if it exists (const recState without window)
    if 'const recState' in content and 'window.p3Answers' not in original:
        content = content.replace(
            "const recState = {'p3': false};",
            "window.recState = {'p3': false}; // Expose globally for speech recognition\n        window.p3Answers = {}; // Initialize answers storage"
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
