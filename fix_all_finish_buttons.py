#!/usr/bin/env python3
"""
Fix finishTestWithAI function in all Part 1 and Part 2 files to use correct function names.
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
    """Fix finishTestWithAI function"""
    content = read_file(filepath)
    original = content
    
    # Replace the old pattern with the new one
    # Old: window.saveSpeakingAndGoToDashboard && window.saveSpeakingAndGoToDashboard(...)
    # New: window.saveSpeakingTestScore && window.saveSpeakingTestScore(...) + redirect
    
    old_code = '''        if(overallBand && overallBand !== '—'){
            window.saveSpeakingAndGoToDashboard && window.saveSpeakingAndGoToDashboard(null, overallBand,'''
    
    new_code = '''        // Save score and redirect to dashboard
        if(overallBand && overallBand !== '—'){
            window.saveSpeakingTestScore && window.saveSpeakingTestScore(null, overallBand,'''
    
    if old_code in content:
        # Find and replace the whole finishTestWithAI function
        # Pattern for the end of the function
        end_pattern = '''        } else {
            window.finishSpeakingTest && window.finishSpeakingTest();
        }
    };'''
        
        new_end = '''        }
        
        // Show toast and redirect
        showToast && showToast('✅ Your score has been saved!');
        setTimeout(function() {
            window.location.href = '/dashboard.html';
        }, 1200);
    };'''
        
        content = content.replace(old_code, new_code)
        content = content.replace(end_pattern, new_end)
        
        write_file(filepath, content)
        return True, "Fixed"
    
    # Check if already has the correct redirect code
    if 'window.location.href = \'/dashboard.html\'' in content:
        return False, "Already fixed"
    
    return False, "Pattern not found or no fix needed"

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking'
    
    # Fix Part 1 and Part 2 files
    all_files = []
    for part_dir in ['Part 1', 'Part 2']:
        all_files.extend(glob.glob(os.path.join(base_dir, part_dir, 'Speaking-*.html')))
    
    fixed_count = 0
    for filepath in sorted(all_files):
        filename = os.path.basename(filepath)
        try:
            success, msg = fix_file(filepath)
            if success:
                print(f"✓ Fixed {filename}")
                fixed_count += 1
            else:
                if "Already fixed" not in msg:
                    print(f"  - {filename}: {msg}")
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
