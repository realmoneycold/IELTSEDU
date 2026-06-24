#!/usr/bin/env python3
"""
Fix IELTS band rounding to nearest 0.5 in all speaking test files.
IELTS bands should be: 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0
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

def roundToHalf(value):
    """Round to nearest 0.5"""
    return round(value * 2) / 2

def fix_file(filepath):
    """Fix band rounding in a file"""
    content = read_file(filepath)
    original = content
    
    # Check if file has evaluateAllAnswers function with band calculation
    if 'evaluateAllAnswers' not in content:
        return False, "No evaluateAllAnswers function"
    
    # Fix 1: Add a roundToHalf function if not present
    if 'function roundToHalf' not in content and 'roundToHalf' not in content:
        # Add roundToHalf function after getAuthToken or at the start of AI functions
        round_func = '''
    // Round to nearest 0.5 for IELTS band scores
    function roundToHalf(value) {
        return Math.round(value * 2) / 2;
    }
'''
        # Find a good place to insert - after getAuthToken
        if 'function getAuthToken()' in content:
            content = content.replace(
                '    function getAuthToken() {',
                round_func + '    function getAuthToken() {'
            )
    
    # Fix 2: Update band calculation to use roundToHalf
    # Pattern 1: const band = parseFloat(a.overallBandRounded || a.overallScore || 0);
    content = re.sub(
        r'const band = parseFloat\(a\.overallBandRounded \|\| a\.overallScore \|\| 0\);',
        'const band = roundToHalf(parseFloat(a.overallBandRounded || a.overallScore || 0));',
        content
    )
    
    # Fix 3: Update the overallBand calculation at the end
    # overallBand = (totalBand / bandCount).toFixed(1);
    content = re.sub(
        r'overallBand = \(totalBand / bandCount\)\.toFixed\(1\);',
        'overallBand = roundToHalf(totalBand / bandCount).toFixed(1);',
        content
    )
    
    # Also fix the individual question band display in results
    # Find: Band: ' + band + '</div>
    # Should use rounded band
    content = re.sub(
        r"'<div class=\"results-ai-band\">Band: '\s*\+and\s*\+\s*'</div>'",
        "'<div class=\"results-ai-band\">Band: ' + roundToHalf(band).toFixed(1) + '</div>'",
        content
    )
    
    if content != original:
        write_file(filepath, content)
        return True, "Fixed band rounding"
    return False, "No changes needed"

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
            success, msg = fix_file(filepath)
            if success:
                print(f"✓ Fixed {filename}")
                fixed_count += 1
            else:
                if "No evaluateAllAnswers" not in msg:
                    print(f"  - {filename}: {msg}")
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
