#!/usr/bin/env python3
"""
Fix duplicate 'const lbl' declarations in speaking test files.
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
    """Remove duplicate 'const lbl' declarations"""
    content = read_file(filepath)
    original = content
    
    # The pattern we need to fix:
    # const btn=...;
    # const textarea = ...;
    # const lbl = ...;  <-- added by our script
    # const wf=...;
    # const lbl=...;   <-- original duplicate (remove this)
    
    # Simple string replacement approach
    lines = content.split('\n')
    new_lines = []
    skip_next = False
    
    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue
        
        # Check if this line is 'const lbl = document.getElementById' with spaces
        # and the next line is 'const lbl=' without space (the duplicate)
        if "const lbl = document.getElementById('record-label-" in line and i < len(lines) - 1:
            next_line = lines[i + 1] if i + 1 < len(lines) else ""
            # If next line is the duplicate (const lbl= without space), skip it
            if "const lbl=document.getElementById('record-label-" in next_line:
                skip_next = True
        
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
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
