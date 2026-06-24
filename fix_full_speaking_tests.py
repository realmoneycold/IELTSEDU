#!/usr/bin/env python3
"""
Fix Full Speaking (All-Parts) tests to have the same features as individual parts:
1. Fix recState scope (make it window.recState)
2. Add answer persistence
3. Ensure AI review works properly
4. Fix finish button functionality
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
    """Fix a Full Speaking test file"""
    content = read_file(filepath)
    original = content
    changes = []
    
    # Fix 1: Change const recState to window.recState
    if 'const recState = { p1: false, p2: false, p3: false };' in content:
        content = content.replace(
            'const recState = { p1: false, p2: false, p3: false };',
            'window.recState = { p1: false, p2: false, p3: false }; // Global for AI functions'
        )
        changes.append("Fixed recState scope")
    
    # Fix 2: Update all recState references to window.recState
    # In the IIFE, we need to use window.recState
    content = re.sub(r'\brecState\[(\'[^\']+\'|"[^"]+"|\w+)\]', r'window.recState[\1]', content)
    content = re.sub(r'\brecState\.', r'window.recState.', content)
    
    # Fix 3: Add answer persistence for Part 1
    # Before renderP1, add: const savedP1 = localStorage.getItem('allparts_p1_answers');
    # and window.p1Answers = savedP1 ? JSON.parse(savedP1) : {};
    
    # Fix 4: Update renderP1 to save/load answers
    old_renderP1 = '''    // ── PART 1 NAVIGATION ───────────────────────────────────────
    function renderP1() {
        for (let i = 1; i <= P1_TOTAL; i++) {
            document.getElementById(`p1-q${i}`).classList.toggle('active', i === p1Current);
        }'''
    
    new_renderP1 = '''    // ── PART 1 NAVIGATION ───────────────────────────────────────
    // Initialize answers storage
    window.p1Answers = {};
    
    function saveP1Answer() {
        const textarea = document.getElementById('ai-text-p1');
        if (textarea) {
            window.p1Answers[p1Current] = textarea.value;
            localStorage.setItem('allparts_p1_answers', JSON.stringify(window.p1Answers));
        }
    }
    
    function loadP1Answer() {
        const textarea = document.getElementById('ai-text-p1');
        if (textarea && window.p1Answers[p1Current]) {
            textarea.value = window.p1Answers[p1Current];
        } else if (textarea) {
            textarea.value = '';
        }
        // Hide AI results when switching questions
        const resultsPanel = document.getElementById('ai-results-p1');
        if (resultsPanel) resultsPanel.classList.remove('visible');
    }
    
    function renderP1() {
        // Save current answer before switching
        saveP1Answer();
        
        for (let i = 1; i <= P1_TOTAL; i++) {
            document.getElementById(`p1-q${i}`).classList.toggle('active', i === p1Current);
        }
        
        // Load answer for new question
        loadP1Answer();'''
    
    if old_renderP1 in content:
        content = content.replace(old_renderP1, new_renderP1)
        changes.append("Added Part 1 answer persistence")
    
    # Fix 5: Update p1Next and p1Prev to save answers
    old_p1Next = '''    window.p1Next = function () {
        if (p1Current < P1_TOTAL) { p1Current++; renderP1(); }
        else switchPart(2);
    };'''
    
    new_p1Next = '''    window.p1Next = function () {
        saveP1Answer();
        if (window.recState.p1) toggleRecord('p1');
        if (p1Current < P1_TOTAL) { 
            p1Current++; 
            setTimeout(renderP1, 100);
        }
        else switchPart(2);
    };'''
    
    if old_p1Next in content:
        content = content.replace(old_p1Next, new_p1Next)
        changes.append("Fixed p1Next to save answers")
    
    old_p1Prev = '''    window.p1Prev = function () {
        if (p1Current > 1) { p1Current--; renderP1(); }
    };'''
    
    new_p1Prev = '''    window.p1Prev = function () {
        saveP1Answer();
        if (window.recState.p1) toggleRecord('p1');
        if (p1Current > 1) { p1Current--; renderP1(); }
    };'''
    
    if old_p1Prev in content:
        content = content.replace(old_p1Prev, new_p1Prev)
        changes.append("Fixed p1Prev to save answers")
    
    # Fix 6: Add similar persistence for Part 3
    old_renderP3 = '''    // ── PART 3 NAVIGATION ───────────────────────────────────────
    function renderP3() {
        for (let i = 1; i <= P3_TOTAL; i++) {
            document.getElementById(`p3-q${i}`).classList.toggle('active', i === p3Current);
        }'''
    
    new_renderP3 = '''    // ── PART 3 NAVIGATION ───────────────────────────────────────
    // Initialize answers storage
    window.p3Answers = {};
    
    function saveP3Answer() {
        const textarea = document.getElementById('ai-text-p3');
        if (textarea) {
            window.p3Answers[p3Current] = textarea.value;
            localStorage.setItem('allparts_p3_answers', JSON.stringify(window.p3Answers));
        }
    }
    
    function loadP3Answer() {
        const textarea = document.getElementById('ai-text-p3');
        if (textarea && window.p3Answers[p3Current]) {
            textarea.value = window.p3Answers[p3Current];
        } else if (textarea) {
            textarea.value = '';
        }
        // Hide AI results when switching questions
        const resultsPanel = document.getElementById('ai-results-p3');
        if (resultsPanel) resultsPanel.classList.remove('visible');
    }
    
    function renderP3() {
        // Save current answer before switching
        saveP3Answer();
        
        for (let i = 1; i <= P3_TOTAL; i++) {
            document.getElementById(`p3-q${i}`).classList.toggle('active', i === p3Current);
        }
        
        // Load answer for new question
        loadP3Answer();'''
    
    if old_renderP3 in content:
        content = content.replace(old_renderP3, new_renderP3)
        changes.append("Added Part 3 answer persistence")
    
    # Fix 7: Update p3Next and p3Prev
    old_p3Next = '''    window.p3Next = function () {
        if (p3Current < P3_TOTAL) { p3Current++; renderP3(); }
    };'''
    
    new_p3Next = '''    window.p3Next = function () {
        saveP3Answer();
        if (window.recState.p3) toggleRecord('p3');
        if (p3Current < P3_TOTAL) { 
            p3Current++; 
            setTimeout(renderP3, 100);
        }
    };'''
    
    if old_p3Next in content:
        content = content.replace(old_p3Next, new_p3Next)
        changes.append("Fixed p3Next to save answers")
    
    old_p3Prev = '''    window.p3Prev = function () {
        if (p3Current > 1) { p3Current--; renderP3(); }
    };'''
    
    new_p3Prev = '''    window.p3Prev = function () {
        saveP3Answer();
        if (window.recState.p3) toggleRecord('p3');
        if (p3Current > 1) { p3Current--; renderP3(); }
    };'''
    
    if old_p3Prev in content:
        content = content.replace(old_p3Prev, new_p3Prev)
        changes.append("Fixed p3Prev to save answers")
    
    # Fix 8: Update p3NextOrFinish to save answers and call evaluateAllAnswers
    old_p3NextOrFinish = '''    window.p3NextOrFinish = function () {
        if (p3Current < P3_TOTAL) {
            p3Current++;
            renderP3();
        } else {
            showTestResults();
        }
    };'''
    
    new_p3NextOrFinish = '''    window.p3NextOrFinish = function () {
        saveP3Answer();
        if (window.recState.p3) toggleRecord('p3');
        if (p3Current < P3_TOTAL) {
            p3Current++;
            renderP3();
        } else if (confirm('Test complete! Get AI evaluation for all answers?')) {
            evaluateAllAnswers();
        }
    };'''
    
    if old_p3NextOrFinish in content:
        content = content.replace(old_p3NextOrFinish, new_p3NextOrFinish)
        changes.append("Fixed p3NextOrFinish with confirmation and evaluateAllAnswers")
    
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
        try:
            success, changes = fix_file(filepath)
            if success:
                print(f"✓ Fixed {filename}: {', '.join(changes)}")
                fixed_count += 1
            else:
                print(f"  - {filename}: No changes or already fixed")
        except Exception as e:
            print(f"✗ Error fixing {filename}: {e}")
    
    print(f"\n=== Fixed {fixed_count} files ===")

if __name__ == '__main__':
    main()
