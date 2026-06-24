#!/usr/bin/env python3
"""
Fix duplicate 'const lbl' declarations in speaking test files.
The script accidentally added duplicate variable declarations.
"""

import os
import re
import glob

def read_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def write_file(filepath, content):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_duplicate_lbl(filepath):
    """Remove duplicate 'const lbl' declarations in toggleRecord function"""
    content = read_file(filepath)
    original = content
    
    # Pattern: const lbl = ... followed by another const lbl = ...
    # We need to remove the second const lbl declaration
    # The pattern is in the toggleRecord function
    
    # Look for the pattern where we have:
    # const textarea = document.getElementById('ai-text-'+part);
    # const lbl = document.getElementById('record-label-'+part);
    # const wf=document.getElementById('waveform-'+part);
    # const lbl=document.getElementById('record-label-'+part);
    
    # We want to remove the last line (duplicate const lbl)
    
    # Fix the pattern with textarea first
    pattern1 = r"(const textarea = document\.getElementById\('ai-text-'\+part\);\s*const lbl = document\.getElementById\('record-label-'\+part\);\s*const wf=document\.getElementById\('waveform-'\+part\);)\s*const lbl=document\.getElementById\('record-label-'\+part\);"
    replacement1 = r"\1"
    content = re.sub(pattern1, replacement1, content)
    
    # Also fix variations with different spacing
    # Pattern with newlines
    pattern2 = r"(const textarea = document\.getElementById\(`ai-text-\$\{part\}`\);\s*const lbl = document\.getElementById\(`record-label-\$\{part\}`\);\s*const wf=document\.getElementById\('waveform-'\+part\);)\s*const lbl=document\.getElementById\('record-label-'\+part\);"
    content = re.sub(pattern2, replacement1, content)
    
    # Another pattern: when it uses template literals
    pattern3 = r"(const textarea = document\.getElementById\(`ai-text-\$\{part\}`\);\s*const lbl = document\.getElementById\(`record-label-\$\{part\}`\);\s*const wf=document\.getElementById\(`waveform-\$\{part\}`\);)\s*const lbl=document\.getElementById\('record-label-'\+part\);"
    content = re.sub(pattern3, replacement1, content)
    
    # Pattern for files where the duplicate is on the next line with same const
    pattern4 = r"(const textarea = document\.getElementById\(['"]?ai-text-['"]?\+part\);?\s*const lbl = document\.getElementById\(['"]?record-label-['"]?\+part\);?\s*const wf=document\.getElementById\(['"]?waveform-['"]?\+part\);?)\s*const lbl=document\.getElementById\(['"]?record-label-['"]?\+part\);?"
    content = re.sub(pattern4, r"\1", content)
    
    # Also fix for files that might have template literals
    pattern5 = r"(const textarea = document\.getElementById\(`ai-text-\$\{part\}`\);?\s*const lbl = document\.getElementById\(`record-label-\$\{part\}`\);?\s*const wf=document\.getElementById\(`waveform-\$\{part\}`\);?)\s*const lbl=document\.getElementById\(`record-label-\$\{part\}`\);?"
    content = re.sub(pattern5, r"\1", content)
    
    if content != original:
        write_file(filepath, content)
        return True
    return False

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking'
    
    # Fix all speaking test files
    all_files = []
    for part_dir in ['Part 1', 'Part 2', 'Part 3']:
        all_files.extend(glob.glob(os.path.join(base_dir, part_dir, 'Speaking-*.html')))
    
    fixed_count = 0
    for filepath in sorted(all_files):
        filename = os.path.basename(filepath)
        try:
            if fix_duplicate_lbl(filepath):
                print(f"✓ Fixed {filename}")
                fixed_count += 1
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
