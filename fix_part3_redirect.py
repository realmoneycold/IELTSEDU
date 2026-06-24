#!/usr/bin/env python3
"""
Fix finishTestWithAI to redirect immediately to dashboard in all Part 3 files.
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
    """Fix finishTestWithAI to redirect immediately"""
    content = read_file(filepath)
    original = content
    
    # Check if already fixed
    if 'window.location.href = \'/dashboard.html\';' in content and 'setTimeout' not in content.split('window.finishTestWithAI')[1].split('};')[0]:
        return False, "Already fixed"
    
    # Pattern to replace - the old finishTestWithAI function
    old_pattern = r'''    window\.finishTestWithAI = async function\(\)\{\n        const overallScoreEl = document\.getElementById\('resultsOverallScore'\);\n        const overallBand = overallScoreEl\.textContent !== '—' \? overallScoreEl\.textContent : null;\n\n        // Save all answers to localStorage for reference\n        localStorage\.setItem\('speaking_p3_set\d+_answers', JSON\.stringify\(window\.p3Answers\)\);\n        localStorage\.setItem\('speaking_p3_set\d+_ai_results', JSON\.stringify\(aiResults\)\);\n\n        await saveTestCompletionLocal\(\);\n\n        // Save score and redirect to dashboard\n        if\(overallBand && overallBand !== '—'\)\{\n            window\.saveSpeakingTestScore && window\.saveSpeakingTestScore\(null, overallBand, 'S_P3_\d+', 'Speaking Part 3 - Set \d+'\);\n        \}\n        \n        // Show toast and redirect\n        showToast && showToast\('✅ Your score has been saved!'\);\n        setTimeout\(function\(\) \{\n            window\.location\.href = '/dashboard\.html';\n        \}, 1200\);\n    \};'''
    
    # New simplified version
    set_num_match = re.search(r'Set(\d+)', os.path.basename(filepath))
    set_num = set_num_match.group(1) if set_num_match else '1'
    test_id = f'S_P3_{set_num.zfill(2)}'
    test_name = f'Speaking Part 3 - Set {set_num}'
    
    new_code = f'''    window.finishTestWithAI = async function(){{
        const overallScoreEl = document.getElementById('resultsOverallScore');
        const overallBand = overallScoreEl.textContent !== '—' ? overallScoreEl.textContent : null;

        // Save all answers to localStorage for reference
        localStorage.setItem('speaking_p3_set{set_num}_answers', JSON.stringify(window.p3Answers));
        localStorage.setItem('speaking_p3_set{set_num}_ai_results', JSON.stringify(aiResults));

        // Save score
        if(overallBand && overallBand !== '—'){{
            window.saveSpeakingTestScore && window.saveSpeakingTestScore(null, overallBand, '{test_id}', '{test_name}');
        }}
        
        // Save test completion
        try {{
            await saveTestCompletionLocal();
        }} catch(e) {{
            console.log('Test completion save attempted');
        }}
        
        // Redirect to dashboard immediately
        window.location.href = '/dashboard.html';
    }};'''
    
    if re.search(old_pattern, content):
        content = re.sub(old_pattern, new_code, content)
        write_file(filepath, content)
        return True, "Fixed"
    
    return False, "Pattern not found"

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
