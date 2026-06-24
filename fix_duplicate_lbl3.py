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
    
    # Find the pattern where we have:
    # const lbl = ... (with spaces)
    # followed by:
    # const lbl=... (without spaces around =)
    
    # Split into lines and process
    lines = content.split('\n')
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this line has "const lbl = " (with spaces)
        if "const lbl = document.getElementById('record-label-" in line or \
           "const lbl = document.getElementById(`record-label-" in line:
            # Look ahead to see if next line is duplicate (const lbl= without space)
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if "const lbl=document.getElementById('record-label-" in next_line or \
                   "const lbl=document.getElementById(`record-label-" in next_line or \
                   "const lbl = document.getElementById('record-label-" in next_line or \
                   "const lbl = document.getElementById(`record-label-" in next_line:
                    # Skip the duplicate line
                    new_lines.append(line)  # Keep the first one
                    i += 2  # Skip the duplicate
                    continue
        
        new_lines.append(line)
        i += 1
    
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
