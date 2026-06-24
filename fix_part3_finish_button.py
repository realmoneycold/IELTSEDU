#!/usr/bin/env python3
"""
Fix finishTestWithAI function in all Part 3 files to use correct function names.
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

def get_test_info(filepath):
    """Extract test ID and name from file"""
    content = read_file(filepath)
    
    # Extract set number
    set_match = re.search(r'Set(\d+)', os.path.basename(filepath))
    set_num = set_match.group(1) if set_match else '1'
    
    test_id = f'S_P3_{set_num.zfill(2)}'
    test_name = f'Speaking Part 3 - Set {set_num}'
    
    return test_id, test_name, set_num

def fix_file(filepath):
    """Fix finishTestWithAI function in a Part 3 file"""
    content = read_file(filepath)
    original = content
    
    test_id, test_name, set_num = get_test_info(filepath)
    
    # Old pattern to replace
    old_pattern = f'''    window.finishTestWithAI = async function(){{
        const overallScoreEl = document.getElementById('resultsOverallScore');
        const overallBand = overallScoreEl.textContent !== '—' ? overallScoreEl.textContent : null;

        // Save all answers to localStorage for reference
        localStorage.setItem('speaking_p3_set{set_num}_answers', JSON.stringify(window.p3Answers));
        localStorage.setItem('speaking_p3_set{set_num}_ai_results', JSON.stringify(aiResults));

        await saveTestCompletion();

        if(overallBand && overallBand !== '—'){{
            window.saveSpeakingAndGoToDashboard && window.saveSpeakingAndGoToDashboard(null, overallBand, '{test_id}', '{test_name}');
        }} else {{
            window.finishSpeakingTest && window.finishSpeakingTest();
        }}
    }};'''
    
    # New pattern
    new_pattern = f'''    window.finishTestWithAI = async function(){{
        const overallScoreEl = document.getElementById('resultsOverallScore');
        const overallBand = overallScoreEl.textContent !== '—' ? overallScoreEl.textContent : null;

        // Save all answers to localStorage for reference
        localStorage.setItem('speaking_p3_set{set_num}_answers', JSON.stringify(window.p3Answers));
        localStorage.setItem('speaking_p3_set{set_num}_ai_results', JSON.stringify(aiResults));

        await saveTestCompletion();

        // Save score and redirect to dashboard
        if(overallBand && overallBand !== '—'){{
            window.saveSpeakingTestScore && window.saveSpeakingTestScore(null, overallBand, '{test_id}', '{test_name}');
        }}
        
        // Show toast and redirect
        showToast && showToast('✅ Your score has been saved!');
        setTimeout(function() {{
            window.location.href = '/dashboard.html';
        }}, 1200);
    }};'''
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        write_file(filepath, content)
        return True, "Fixed"
    
    # Check if already fixed
    if 'window.location.href = \'/dashboard.html\'' in content and 'speakingTestScore' in content:
        return False, "Already fixed"
    
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
