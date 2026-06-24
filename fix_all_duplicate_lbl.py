#!/usr/bin/env python3
"""
Fix duplicate 'const lbl' declarations in ALL speaking test files.
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
    """Remove duplicate 'const lbl' declarations by simple string replacement"""
    content = read_file(filepath)
    original = content
    
    # The exact pattern to remove (the duplicate line):
    # This is the second const lbl declaration that comes after wf
    # 
    # const lbl = document.getElementById('record-label-'+part);
    # const wf=document.getElementById('waveform-'+part);
    # const lbl=document.getElementById('record-label-'+part);  <-- REMOVE THIS
    #
    # We look for the pattern where we have:
    # "const lbl = document.getElementById('record-label-" 
    # followed later by
    # "const lbl=document.getElementById('record-label-" (without spaces)
    
    # Replace the specific duplicate pattern
    # Pattern 1: For Part 1 files
    duplicate_pattern1 = """            const lbl = document.getElementById('record-label-'+part);
            const wf=document.getElementById('waveform-'+part);
            const lbl=document.getElementById('record-label-'+part);"""
    
    replacement1 = """            const lbl = document.getElementById('record-label-'+part);
            const wf=document.getElementById('waveform-'+part);"""
    
    content = content.replace(duplicate_pattern1, replacement1)
    
    # Pattern 2: For Part 2/3 files with spaces
    duplicate_pattern2 = """            const lbl = document.getElementById('record-label-' + part);
            const wf = document.getElementById('waveform-' + part);
            const lbl = document.getElementById('record-label-' + part);"""
    
    replacement2 = """            const lbl = document.getElementById('record-label-' + part);
            const wf = document.getElementById('waveform-' + part);"""
    
    content = content.replace(duplicate_pattern2, replacement2)
    
    # Pattern 3: For Part 2/3 files with template literals
    duplicate_pattern3 = """            const lbl = document.getElementById(`record-label-${part}`);
            const wf = document.getElementById(`waveform-${part}`);
            const lbl = document.getElementById(`record-label-${part}`);"""
    
    replacement3 = """            const lbl = document.getElementById(`record-label-${part}`);
            const wf = document.getElementById(`waveform-${part}`);"""
    
    content = content.replace(duplicate_pattern3, replacement3)
    
    if content != original:
        write_file(filepath, content)
        return True
    return False

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking'
    
    all_files = []
    for part_dir in ['Part 1', 'Part 2', 'Part 3']:
        all_files.extend(glob.glob(os.path.join(base_dir, part_dir, 'Speaking-*.html')))
    
    fixed_count = 0
    for filepath in sorted(all_files):
        filename = os.path.basename(filepath)
        try:
            if fix_file(filepath):
                print(f"✓ Fixed {filename}")
                fixed_count += 1
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
