#!/usr/bin/env python3
"""
Fix All-Parts navigation to:
1. Remove saveAnswer from render functions (prevents overwriting)
2. Remove setTimeout from navigation for immediate rendering
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
    """Fix navigation in an All-Parts file"""
    content = read_file(filepath)
    original = content
    changes = []
    
    # Fix 1: Remove saveP1Answer from renderP1
    old_renderP1 = '''    function renderP1() {
        // Save current answer before switching
        saveP1Answer();
        
        for (let i = 1; i <= P1_TOTAL; i++) {
            document.getElementById(`p1-q${i}`).classList.toggle('active', i === p1Current);
        }
        
        // Load answer for new question
        loadP1Answer();'''
    
    new_renderP1 = '''    function renderP1() {
        for (let i = 1; i <= P1_TOTAL; i++) {
            document.getElementById(`p1-q${i}`).classList.toggle('active', i === p1Current);
        }
        
        // Load answer for current question (blank if not answered yet)
        loadP1Answer();'''
    
    if old_renderP1 in content:
        content = content.replace(old_renderP1, new_renderP1)
        changes.append("Fixed renderP1")
    
    # Fix 2: Remove saveP3Answer from renderP3
    old_renderP3 = '''    function renderP3() {
        // Save current answer before switching
        saveP3Answer();
        
        for (let i = 1; i <= P3_TOTAL; i++) {
            document.getElementById(`p3-q${i}`).classList.toggle('active', i === p3Current);
        }
        
        // Load answer for new question
        loadP3Answer();'''
    
    new_renderP3 = '''    function renderP3() {
        for (let i = 1; i <= P3_TOTAL; i++) {
            document.getElementById(`p3-q${i}`).classList.toggle('active', i === p3Current);
        }
        
        // Load answer for current question (blank if not answered yet)
        loadP3Answer();'''
    
    if old_renderP3 in content:
        content = content.replace(old_renderP3, new_renderP3)
        changes.append("Fixed renderP3")
    
    # Fix 3: Remove setTimeout from p1Next
    old_p1Next = '''    window.p1Next = function () {
        saveP1Answer();
        if (window.recState.p1) toggleRecord('p1');
        if (p1Current < P1_TOTAL) { 
            p1Current++; 
            setTimeout(renderP1, 100);
        }
        else switchPart(2);
    };'''
    
    new_p1Next = '''    window.p1Next = function () {
        saveP1Answer();
        if (window.recState.p1) toggleRecord('p1');
        if (p1Current < P1_TOTAL) { 
            p1Current++; 
            renderP1();
        }
        else switchPart(2);
    };'''
    
    if old_p1Next in content:
        content = content.replace(old_p1Next, new_p1Next)
        changes.append("Fixed p1Next")
    
    # Fix 4: Remove setTimeout from p3Next
    old_p3Next = '''    window.p3Next = function () {
        saveP3Answer();
        if (window.recState.p3) toggleRecord('p3');
        if (p3Current < P3_TOTAL) { 
            p3Current++; 
            setTimeout(renderP3, 100);
        }
    };'''
    
    new_p3Next = '''    window.p3Next = function () {
        saveP3Answer();
        if (window.recState.p3) toggleRecord('p3');
        if (p3Current < P3_TOTAL) { 
            p3Current++; 
            renderP3();
        }
    };'''
    
    if old_p3Next in content:
        content = content.replace(old_p3Next, new_p3Next)
        changes.append("Fixed p3Next")
    
    if content != original:
        write_file(filepath, content)
        return True, changes
    return False, changes

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
            success, changes = fix_file(filepath)
            if success:
                print(f"✓ Fixed {filename}: {', '.join(changes)}")
                fixed_count += 1
            else:
                print(f"  - {filename}: No changes needed or already fixed")
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
