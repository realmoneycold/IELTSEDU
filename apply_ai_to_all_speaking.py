#!/usr/bin/env python3
"""
Apply AI evaluation features to all speaking tests.
This script applies the same changes made to Speaking-Part1-Set1.html to all other speaking tests.
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

def get_part_info(filepath):
    """Determine which part type based on filepath"""
    if 'Part 1' in filepath:
        return 'part1', 'p1', 9
    elif 'Part 2' in filepath:
        return 'part2', 'p2', 1
    elif 'Part 3' in filepath:
        return 'part3', 'p3', 5
    elif 'All Parts' in filepath:
        return 'allparts', 'all', 0
    return None, None, 0

def get_test_info(filepath):
    """Extract test ID and name from filepath"""
    filename = os.path.basename(filepath)
    # Extract set number from filename like Speaking-Part1-Set10.html
    match = re.search(r'Set(\d+)', filename)
    set_num = match.group(1) if match else '1'
    
    part_type, prefix, total = get_part_info(filepath)
    
    if part_type == 'part1':
        test_id = f'S_P1_{set_num.zfill(2)}'
        test_name = f'Speaking Part 1 - Set {set_num}'
    elif part_type == 'part2':
        test_id = f'S_P2_{set_num.zfill(2)}'
        test_name = f'Speaking Part 2 - Set {set_num}'
    elif part_type == 'part3':
        test_id = f'S_P3_{set_num.zfill(2)}'
        test_name = f'Speaking Part 3 - Set {set_num}'
    else:
        test_id = f'S_ALL_{set_num.zfill(2)}'
        test_name = f'Full Speaking Test - Set {set_num}'
    
    return test_id, test_name, part_type, prefix, total

# AI CSS Styles to inject
AI_CSS_STYLES = '''
        /* AI Speaking Review Styles */
        .ai-response-section {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px dashed #ddd;
        }
        .ai-response-label {
            font-size: 13px;
            font-weight: 700;
            color: #555;
            margin-bottom: 8px;
            display: block;
        }
        .ai-response-textarea {
            width: 100%;
            min-height: 120px;
            border: 2px solid #e8e8e8;
            border-radius: 10px;
            padding: 14px;
            font-size: 15px;
            line-height: 1.5;
            font-family: Arial, sans-serif;
            resize: vertical;
            transition: border-color 0.2s;
        }
        .ai-response-textarea:focus {
            outline: none;
            border-color: #8B5CF6;
        }
        .ai-response-textarea.transcribing {
            border-color: #10B981;
            animation: pulse-border 1.5s ease-in-out infinite;
        }
        @keyframes pulse-border {
            0%, 100% { border-color: #10B981; box-shadow: 0 0 0 0 rgba(16,185,129,0.2); }
            50% { border-color: #34D399; box-shadow: 0 0 0 4px rgba(16,185,129,0.1); }
        }
        .ai-review-btn {
            margin-top: 10px;
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: transform 0.2s, box-shadow 0.2s;
            font-family: Arial, sans-serif;
        }
        .ai-review-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(139,92,246,0.35);
        }
        .ai-review-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .ai-loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: ai-spin 0.8s linear infinite;
        }
        @keyframes ai-spin {
            to { transform: rotate(360deg); }
        }
        .ai-results-panel {
            margin-top: 16px;
            padding: 16px;
            background: #faf9ff;
            border-radius: 10px;
            border: 1px solid #e8e0f5;
            display: none;
        }
        .ai-results-panel.visible {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        .ai-overall-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            border-radius: 8px;
            margin-bottom: 12px;
        }
        .ai-overall-label {
            font-size: 14px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
        }
        .ai-overall-score {
            font-size: 24px;
            font-weight: 800;
            color: #fff;
        }
        .ai-band-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: #fff;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        .ai-criteria-name {
            font-size: 13px;
            color: #666;
        }
        .ai-band-badge {
            background: #8B5CF6;
            color: #fff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
        }
        .ai-feedback-section {
            margin-top: 12px;
            padding: 12px;
            background: #fff;
            border-radius: 6px;
        }
        .ai-feedback-heading {
            font-size: 12px;
            font-weight: 700;
            color: #8B5CF6;
            text-transform: uppercase;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }
        .ai-feedback-text {
            font-size: 13px;
            color: #444;
            line-height: 1.6;
        }
'''

# Results Modal CSS
RESULTS_MODAL_CSS = '''
        /* Results Modal Styles */
        .results-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .results-overlay.visible {
            display: flex;
            animation: fadeIn 0.3s ease;
        }
        .results-modal {
            background: #fff;
            border-radius: 16px;
            max-width: 700px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .results-header {
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: #fff;
            padding: 20px 24px;
            border-radius: 16px 16px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .results-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
        }
        .results-close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 28px;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        }
        .results-close-btn:hover {
            background: rgba(255,255,255,0.2);
        }
        .results-overall-bar {
            background: #f9f5ff;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e0d4f7;
        }
        .results-overall-label {
            font-size: 16px;
            font-weight: 700;
            color: #555;
        }
        .results-overall-score {
            font-size: 36px;
            font-weight: 800;
            color: #7C3AED;
        }
        .results-body {
            padding: 20px 24px;
        }
        .results-question-block {
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        .results-question-block:last-child {
            border-bottom: none;
        }
        .results-question-title {
            font-size: 14px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 8px;
        }
        .results-answer-text {
            font-size: 13px;
            color: #666;
            background: #f5f5f5;
            padding: 10px 14px;
            border-radius: 8px;
            margin-bottom: 10px;
            font-style: italic;
        }
        .results-ai-band {
            display: inline-block;
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: #fff;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 700;
        }
        .results-loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .results-loading-spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid #e0d4f7;
            border-top-color: #8B5CF6;
            border-radius: 50%;
            animation: ai-spin 1s linear infinite;
            margin-bottom: 16px;
        }
        .results-footer {
            padding: 16px 24px 24px;
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        .results-btn {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }
        .results-btn-primary {
            background: linear-gradient(135deg, #8B5CF6, #7C3AED);
            color: #fff;
        }
        .results-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(139,92,246,0.35);
        }
        .results-btn-secondary {
            background: #f0f0f0;
            color: #444;
        }
'''

def get_ai_response_html(prefix):
    """Get AI response HTML section"""
    return f'''
                <!-- AI Speaking Review Section -->
                <div class="ai-response-section">
                    <label class="ai-response-label">✍️ Type your answer here for AI Review</label>
                    <textarea id="ai-text-{prefix}" class="ai-response-textarea" placeholder="Type or speak..."></textarea>
                    <button id="ai-btn-{prefix}" class="ai-review-btn" onclick="submitSpeakingReview('{prefix}')">🤖 Get AI Feedback</button>
                    <div id="ai-results-{prefix}" class="ai-results-panel"></div>
                </div>
'''

def get_results_modal_html():
    """Get results modal HTML"""
    return '''
    <!-- Results Modal -->
    <div class="results-overlay" id="resultsOverlay">
        <div class="results-modal">
            <div class="results-header">
                <h2>Speaking Test Results</h2>
                <button class="results-close-btn" onclick="closeResults()">×</button>
            </div>
            <div class="results-overall-bar" id="resultsOverall">
                <span class="results-overall-label">Overall Band</span>
                <span class="results-overall-score" id="resultsOverallScore">—</span>
            </div>
            <div class="results-body" id="resultsBody">
                <!-- Populated by JS -->
            </div>
            <div class="results-footer">
                <button class="results-btn results-btn-secondary" onclick="closeResults()">Close</button>
                <button class="results-btn results-btn-primary" onclick="finishTestWithAI()">Finish & Go to Dashboard</button>
            </div>
        </div>
    </div>
'''

def get_ai_review_js(test_id, test_name, part_type, prefix, total_questions):
    """Get AI review JavaScript functions"""
    
    # For Part 1 and Part 3, use the multi-question evaluation
    # For Part 2, use single question evaluation
    
    if part_type in ['part1', 'part3']:
        # Multi-question test (Part 1: 9 questions, Part 3: 5 questions)
        return f'''
    // Store AI results for each question
    const aiResults = {{}};
    
    // Evaluate all answers with AI
    async function evaluateAllAnswers(){{
        const resultsOverlay = document.getElementById('resultsOverlay');
        const resultsBody = document.getElementById('resultsBody');
        const overallScoreEl = document.getElementById('resultsOverallScore');
        
        resultsOverlay.classList.add('visible');
        resultsBody.innerHTML = '<div class="results-loading"><div class="results-loading-spinner"></div><p>Analyzing all your answers with AI...<br><small>Evaluating Question 1 of ' + window.P{prefix.upper()}_TOTAL + '</small></p></div>';
        overallScoreEl.textContent = '—';
        
        const token = getAuthToken();
        if(!token){{
            resultsBody.innerHTML = '<p style="color:#e53935;text-align:center;">You need to be logged in to use AI evaluation.</p>';
            return;
        }}
        
        let totalBand = 0;
        let bandCount = 0;
        let resultsHtml = '';
        let evaluatedCount = 0;
        let answeredCount = 0;
        
        // Count how many questions have answers
        for(let i=1; i<=window.P{prefix.upper()}_TOTAL; i++){{
            if(window.p{prefix}Answers[i] && window.p{prefix}Answers[i].trim()) answeredCount++;
        }}
        
        // Evaluate each question
        for(let i=1; i<=window.P{prefix.upper()}_TOTAL; i++){{
            const answer = window.p{prefix}Answers[i] || '';
            const questionText = window.getQuestionText(i);
            
            if(!answer.trim()){{
                resultsHtml += '<div class="results-question-block">';
                resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                resultsHtml += '<div class="results-empty" style="color:#999;font-style:italic;">No answer provided (skipped)</div>';
                resultsHtml += '</div>';
                // Update progress
                resultsBody.innerHTML = resultsHtml + '<div class="results-loading" style="margin-top:20px;"><div class="results-loading-spinner"></div><p>Evaluating Question ' + (i+1) + ' of ' + window.P{prefix.upper()}_TOTAL + '<br><small>' + evaluatedCount + ' of ' + answeredCount + ' answers evaluated</small></p></div>';
                continue;
            }}
            
            try{{
                // Create an AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const res = await fetch('/api/ai/assess-speaking', {{
                    method: 'POST',
                    headers: {{ 
                        'Content-Type': 'application/json', 
                        'Authorization': 'Bearer ' + token 
                    }},
                    body: JSON.stringify({{ 
                        speakingText: answer, 
                        partType: '{part_type.upper()}', 
                        questionPrompt: questionText 
                    }}),
                    signal: controller.signal
                }});
                clearTimeout(timeoutId);
                
                const data = await res.json();
                
                if(data.success && data.assessment){{
                    const a = data.assessment;
                    const band = parseFloat(a.overallBandRounded || a.overallScore || 0);
                    aiResults[i] = a;
                    evaluatedCount++;
                    
                    if(!isNaN(band) && band > 0){{
                        totalBand += band;
                        bandCount++;
                    }}
                    
                    resultsHtml += '<div class="results-question-block">';
                    resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                    resultsHtml += '<div class="results-answer-text">' + escapeHtml(answer.substring(0, 100) + (answer.length > 100 ? '...' : '')) + '</div>';
                    resultsHtml += '<div class="results-ai-band">Band: ' + band + '</div>';
                    resultsHtml += '</div>';
                }} else {{
                    resultsHtml += '<div class="results-question-block">';
                    resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                    resultsHtml += '<div class="results-answer-text">' + escapeHtml(answer.substring(0, 100)) + '...</div>';
                    resultsHtml += '<div style="color:#e53935;">AI evaluation failed: ' + (data.error || 'Unknown error') + '</div>';
                    resultsHtml += '</div>';
                }}
            }} catch(err){{
                console.error('AI evaluation error for Q' + i, err);
                let errorMsg = err.message;
                if(err.name === 'AbortError') errorMsg = 'Request timed out (30s)';
                resultsHtml += '<div class="results-question-block">';
                resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                resultsHtml += '<div class="results-answer-text">' + escapeHtml(answer.substring(0, 100)) + '...</div>';
                resultsHtml += '<div style="color:#e53935;">Error: ' + escapeHtml(errorMsg) + '</div>';
                resultsHtml += '</div>';
            }}
            
            // Update body with current progress
            const nextQ = i < window.P{prefix.upper()}_TOTAL ? i + 1 : 'Done';
            const progressMsg = nextQ === 'Done' ? 'Complete!' : 'Evaluating Question ' + nextQ + ' of ' + window.P{prefix.upper()}_TOTAL;
            resultsBody.innerHTML = resultsHtml + '<div class="results-loading" style="margin-top:20px;"><div class="results-loading-spinner"></div><p>' + progressMsg + '<br><small>' + evaluatedCount + ' of ' + answeredCount + ' answers evaluated</small></p></div>';
        }}
        
        // Calculate overall band
        let overallBand = '—';
        if(bandCount > 0){{
            overallBand = (totalBand / bandCount).toFixed(1);
            overallScoreEl.textContent = overallBand;
            
            // Save the overall result
            window.autoSaveSpeakingScore(null, overallBand);
        }} else {{
            overallScoreEl.textContent = '—';
        }}
        
        // Final results without loading spinner
        let summaryText = '';
        if(bandCount > 0){{
            summaryText = '<div style="text-align:center;margin:20px 0;padding:15px;background:#f0fdf4;border-radius:8px;"><strong style="color:#10B981;">' + evaluatedCount + ' answers evaluated</strong><br>Based on ' + bandCount + ' scored answers<br>Skipped: ' + (window.P{prefix.upper()}_TOTAL - answeredCount) + ' questions</div>';
        }} else {{
            summaryText = '<div style="text-align:center;margin:20px 0;padding:15px;background:#fef2f2;border-radius:8px;color:#e53935;">No answers could be evaluated.<br>Please provide at least one answer.</div>';
        }}
        resultsBody.innerHTML = summaryText + resultsHtml;
    }}
    
    window.closeResults = function(){{
        document.getElementById('resultsOverlay').classList.remove('visible');
    }};
    
    window.finishTestWithAI = async function(){{
        const overallScoreEl = document.getElementById('resultsOverallScore');
        const overallBand = overallScoreEl.textContent !== '—' ? overallScoreEl.textContent : null;
        
        // Save all answers to localStorage for reference
        localStorage.setItem('speaking_{part_type}_{test_id.lower().replace("s_", "")}_answers', JSON.stringify(window.p{prefix}Answers));
        localStorage.setItem('speaking_{part_type}_{test_id.lower().replace("s_", "")}_ai_results', JSON.stringify(aiResults));
        
        await saveTestCompletion();
        
        if(overallBand && overallBand !== '—'){{
            window.saveSpeakingAndGoToDashboard(null, overallBand, '{test_id}', '{test_name}');
        }} else {{
            window.finishSpeakingTest();
        }}
    }};
'''
    else:
        # Single question test (Part 2)
        return f'''
    // Store AI results
    let aiResults = null;
    
    // Evaluate answer with AI for Part 2
    async function evaluateAllAnswers(){{
        const resultsOverlay = document.getElementById('resultsOverlay');
        const resultsBody = document.getElementById('resultsBody');
        const overallScoreEl = document.getElementById('resultsOverallScore');
        
        resultsOverlay.classList.add('visible');
        resultsBody.innerHTML = '<div class="results-loading"><div class="results-loading-spinner"></div><p>Analyzing your answer with AI...</p></div>';
        overallScoreEl.textContent = '—';
        
        const token = getAuthToken();
        if(!token){{
            resultsBody.innerHTML = '<p style="color:#e53935;text-align:center;">You need to be logged in to use AI evaluation.</p>';
            return;
        }}
        
        // Get the answer from the AI textarea
        const answer = document.getElementById('ai-text-{prefix}')?.value || '';
        
        if(!answer.trim()){{
            resultsBody.innerHTML = '<div style="text-align:center;margin:20px 0;padding:15px;background:#fef2f2;border-radius:8px;color:#e53935;">No answer provided.<br>Please record or type your answer first.</div>';
            overallScoreEl.textContent = '—';
            return;
        }}
        
        // Get question text from cue card
        const cueTask = document.querySelector('.cue-task')?.textContent || '';
        
        try{{
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const res = await fetch('/api/ai/assess-speaking', {{
                method: 'POST',
                headers: {{ 
                    'Content-Type': 'application/json', 
                    'Authorization': 'Bearer ' + token 
                }},
                body: JSON.stringify({{ 
                    speakingText: answer, 
                    partType: 'Part2', 
                    questionPrompt: cueTask 
                }}),
                signal: controller.signal
            }});
            clearTimeout(timeoutId);
            
            const data = await res.json();
            
            if(data.success && data.assessment){{
                const a = data.assessment;
                const band = parseFloat(a.overallBandRounded || a.overallScore || 0);
                aiResults = a;
                
                overallScoreEl.textContent = band;
                
                // Save the result
                window.autoSaveSpeakingScore(null, band);
                
                let html = '<div class="results-question-block">';
                html += '<div class="results-question-title">Your Answer</div>';
                html += '<div class="results-answer-text">' + escapeHtml(answer.substring(0, 150) + (answer.length > 150 ? '...' : '')) + '</div>';
                html += '<div class="results-ai-band">Band: ' + band + '</div>';
                html += '</div>';
                
                if(a.examinerNotes) {{
                    html += '<div class="results-question-block">';
                    html += '<div style="font-size:12px;font-weight:700;color:#8B5CF6;text-transform:uppercase;margin-bottom:8px;">Examiner Notes</div>';
                    html += '<div style="font-size:13px;color:#444;line-height:1.6;">' + escapeHtml(a.examinerNotes) + '</div>';
                    html += '</div>';
                }}
                
                resultsBody.innerHTML = html;
            }} else {{
                resultsBody.innerHTML = '<div style="color:#e53935;text-align:center;padding:20px;">AI evaluation failed: ' + (data.error || 'Unknown error') + '</div>';
            }}
        }} catch(err){{
            console.error('AI evaluation error', err);
            let errorMsg = err.message;
            if(err.name === 'AbortError') errorMsg = 'Request timed out (30s)';
            resultsBody.innerHTML = '<div style="color:#e53935;text-align:center;padding:20px;">Error: ' + escapeHtml(errorMsg) + '</div>';
        }}
    }}
    
    window.closeResults = function(){{
        document.getElementById('resultsOverlay').classList.remove('visible');
    }};
    
    window.finishTestWithAI = async function(){{
        const overallScoreEl = document.getElementById('resultsOverallScore');
        const overallBand = overallScoreEl.textContent !== '—' ? overallScoreEl.textContent : null;
        
        // Save answer to localStorage for reference
        const answer = document.getElementById('ai-text-{prefix}')?.value || '';
        localStorage.setItem('speaking_{part_type}_{test_id.lower().replace("s_", "")}_answer', answer);
        if(aiResults) {{
            localStorage.setItem('speaking_{part_type}_{test_id.lower().replace("s_", "")}_ai_results', JSON.stringify(aiResults));
        }}
        
        await saveTestCompletion();
        
        if(overallBand && overallBand !== '—'){{
            window.saveSpeakingAndGoToDashboard(null, overallBand, '{test_id}', '{test_name}');
        }} else {{
            window.finishSpeakingTest();
        }}
    }};
'''

def get_common_ai_functions(prefix):
    """Get common AI review functions"""
    return f'''
    // AI Speaking Review Functions
    function getAuthToken() {{
        return localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('ielts_token') || '';
    }}
    
    function escapeHtml(text) {{
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }}
    
    function getCurrentQuestionText() {{
        const activeBlock = document.querySelector('.question-block.active');
        if(!activeBlock) return '';
        const heading = activeBlock.querySelector('.p1-topic-heading, .p3-topic-heading');
        const question = activeBlock.querySelector('.p1-question, .p3-question');
        return (heading ? heading.textContent + ': ' : '') + (question ? question.textContent : '');
    }}
    
    window.getQuestionText = function(qNum){{
        const qBlock = document.getElementById('{prefix}-q'+qNum);
        if(qBlock){{
            const heading = qBlock.querySelector('.p1-topic-heading, .p3-topic-heading');
            const question = qBlock.querySelector('.p1-question, .p3-question');
            return (heading ? heading.textContent + ': ' : '') + (question ? question.textContent : '');
        }}
        return '';
    }}
    
    async function submitSpeakingReview(part) {{
        const btn = document.getElementById('ai-btn-' + part);
        const panel = document.getElementById('ai-results-' + part);
        const textarea = document.getElementById('ai-text-' + part);
        const answer = textarea?.value?.trim();
        
        if(!answer){{
            alert('Please type or speak your answer first!');
            return;
        }}
        
        btn.disabled = true;
        btn.innerHTML = '<span class="ai-loading"></span> Analyzing...';
        
        const token = getAuthToken();
        if(!token){{
            panel.innerHTML = '<p style="color:#e53935">Please log in to use AI review.</p>';
            panel.classList.add('visible');
            btn.disabled = false;
            btn.textContent = '🤖 Get AI Feedback';
            return;
        }}
        
        try{{
            const res = await fetch('/api/ai/assess-speaking', {{
                method: 'POST',
                headers: {{ 
                    'Content-Type': 'application/json', 
                    'Authorization': 'Bearer ' + token 
                }},
                body: JSON.stringify({{ 
                    speakingText: answer, 
                    partType: 'Part1', 
                    questionPrompt: getCurrentQuestionText() 
                }})
            }});
            const data = await res.json();
            
            if(data.success && data.assessment){{
                displaySpeakingResults(panel, data.assessment);
            }} else {{
                panel.innerHTML = '<p style="color:#e53935">' + (data.error || 'AI assessment failed. Please try again.') + '</p>';
                panel.classList.add('visible');
            }}
        }} catch(e){{
            console.error('AI review error:', e);
            panel.innerHTML = '<p style="color:#e53935">Error connecting to AI. Please try again.</p>';
            panel.classList.add('visible');
        }}
        
        btn.disabled = false;
        btn.textContent = '🤖 Get AI Feedback';
    }}
    
    function displaySpeakingResults(panel, a) {{
        const f = a.fluencyAndCoherence || {{}};
        const l = a.lexicalResource || {{}};
        const g = a.grammaticalRangeAndAccuracy || {{}};
        const p = a.pronunciation || {{}};
        const overall = a.overallBandRounded || a.overallScore || 'N/A';
        
        let html = '<div class="ai-overall-row"><span class="ai-overall-label">Overall Band</span><span class="ai-overall-score">' + overall + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Fluency & Coherence</span><span class="ai-band-badge">' + (f.score || f.band || 'N/A') + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Lexical Resource</span><span class="ai-band-badge">' + (l.score || l.band || 'N/A') + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Grammar</span><span class="ai-band-badge">' + (g.score || g.band || 'N/A') + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Pronunciation</span><span class="ai-band-badge">' + (p.score || p.band || 'N/A') + '</span></div>';
        
        if(a.examinerNotes) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Examiner Notes</div><div class="ai-feedback-text">' + escapeHtml(a.examinerNotes) + '</div></div>';
        }}
        if(a.strengths && a.strengths.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Strengths</div><div class="ai-feedback-text">' + a.strengths.map(function(s) {{ return '✅ ' + escapeHtml(s); }}).join('<br>') + '</div></div>';
        }}
        if(a.weaknesses && a.weaknesses.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Areas to Improve</div><div class="ai-feedback-text">' + a.weaknesses.map(function(w) {{ return '⚠️ ' + escapeHtml(w); }}).join('<br>') + '</div></div>';
        }}
        if(a.improvements && a.improvements.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Suggestions</div><div class="ai-feedback-text">' + a.improvements.map(function(i) {{ return '💡 ' + escapeHtml(i); }}).join('<br>') + '</div></div>';
        }}
        if(p.wordsToPractice && p.wordsToPractice.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Words to Practice</div><div class="ai-feedback-text">' + p.wordsToPractice.map(function(w) {{ return escapeHtml(w); }}).join(', ') + '</div></div>';
        }}
        
        panel.innerHTML = html;
        panel.classList.add('visible');
        panel.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }});
    }}
'''

def get_speech_recognition_code(prefix):
    """Get speech recognition JavaScript code"""
    return f'''
    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecs = {{}};
    
    function startSpeechRecognition(part) {{
        if (!SpeechRecognition) return;
        const textarea = document.getElementById('ai-text-' + part);
        if (!textarea) return;
        
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        
        let finalTranscript = '';
        
        rec.onresult = (e) => {{
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {{
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalTranscript += t + ' ';
                else interim += t;
            }}
            textarea.value = finalTranscript + interim;
            textarea.classList.add('transcribing');
        }};
        
        rec.onerror = (e) => {{
            console.warn('Speech error:', e.error);
            textarea.placeholder = 'Mic blocked — type instead';
        }};
        
        rec.onend = () => {{
            textarea.classList.remove('transcribing');
            if (recState[part]) startSpeechRecognition(part);
        }};
        
        speechRecs[part] = rec;
        try {{ rec.start(); }} catch(e) {{ console.warn('Speech start failed:', e); }}
    }}
    
    function stopSpeechRecognition(part) {{
        const rec = speechRecs[part];
        if (rec) {{
            rec.stop();
            rec.abort();
            delete speechRecs[part];
        }}
    }}
'''

def process_part1_file(filepath, filename):
    """Process a Part 1 speaking test file"""
    print(f"Processing {filename}...")
    
    content = read_file(filepath)
    original = content
    
    test_id, test_name, part_type, prefix, total = get_test_info(filepath)
    
    # 1. Add AI CSS before </style>
    ai_css = AI_CSS_STYLES + RESULTS_MODAL_CSS
    content = content.replace('</style>', ai_css + '    </style>')
    
    # 2. Find record section and add AI response section after it
    # Pattern: record-section div closing tag
    record_section_pattern = r'(</div>\s*<div class="card-footer">)'
    ai_html = get_ai_response_html('p1') + '\n            </div>\n            <div class="card-footer">'
    content = re.sub(record_section_pattern, ai_html, content, count=1)
    
    # 3. Add results modal before </body>
    results_modal = get_results_modal_html()
    content = content.replace('</body>', results_modal + '</body>')
    
    # 4. Modify the script to expose globals and add AI functions
    # Change P1_TOTAL to window.P1_TOTAL
    content = re.sub(r'const P1_TOTAL = 9;', 'window.P1_TOTAL = 9; // Expose globally for AI evaluation', content)
    
    # Change p1Answers to window.p1Answers
    content = re.sub(r'const p1Answers = \{\};', 'window.p1Answers = {}; // Expose globally for AI evaluation', content)
    
    # Update references inside IIFE to use window.p1Answers
    content = content.replace('p1Answers[p1Current]', 'window.p1Answers[p1Current]')
    
    # 5. Add getQuestionText as window.getQuestionText
    get_question_text = '''
    window.getQuestionText = function(qNum){
        const qBlock = document.getElementById('p1-q'+qNum);
        if(qBlock){
            const heading = qBlock.querySelector('.p1-topic-heading');
            const question = qBlock.querySelector('.p1-question');
            return (heading ? heading.textContent + ': ' : '') + (question ? question.textContent : '');
        }
        return '';
    }
    '''
    
    # Insert before saveTestCompletion function
    content = content.replace(
        '        // Test tracking function',
        '    ' + get_question_text + '''
        // Test tracking function'''
    )
    
    # 6. Add saveCurrentAnswer function and modify navigation
    save_current_answer = '''
        // Save current answer before navigating
        function saveCurrentAnswer(){
            const aiTextarea = document.getElementById('ai-text-p1');
            if (aiTextarea) {
                window.p1Answers[p1Current] = aiTextarea.value;
            }
        }
        
'''
    
    # Find where p1Next starts and insert before it
    content = content.replace(
        '        window.p1Next=function(){',
        save_current_answer + '        window.p1Next=function(){\n            saveCurrentAnswer();'
    )
    
    # Also add saveCurrentAnswer call to p1Prev
    content = content.replace(
        '        window.p1Prev=function(){',
        '        window.p1Prev=function(){\n            saveCurrentAnswer();'
    )
    
    # 7. Modify renderP1 to load saved answer
    old_render_p1 = "document.getElementById('record-label-p1').textContent='Tap to Record Your Answer';"
    new_render_p1 = """document.getElementById('record-label-p1').textContent='Tap to Record Your Answer';
            
            // Load saved answer for current question and hide results
            const aiTextarea = document.getElementById('ai-text-p1');
            const aiResults = document.getElementById('ai-results-p1');
            if (aiTextarea) aiTextarea.value = window.p1Answers[p1Current] || '';
            if (aiResults) aiResults.classList.remove('visible');"""
    content = content.replace(old_render_p1, new_render_p1)
    
    # 8. Modify finish logic to call evaluateAllAnswers instead of redirect
    old_finish = """else if(confirm('Test complete!')){
                    saveTestCompletion().then(() => {
                        window.location.href='../index.html';
                    });
                }"""
    
    new_finish = """else if(confirm('Test complete! Get AI evaluation for all answers?')){
                    saveCurrentAnswer();
                    evaluateAllAnswers();
                }"""
    
    # Replace both occurrences (in if and else branches)
    content = content.replace(old_finish, new_finish)
    
    # 9. Modify toggleRecord to integrate speech recognition
    old_toggle_record_start = "window.toggleRecord=function(part){\n            const btn=document.getElementById('record-btn-'+part);"
    new_toggle_record_start = """window.toggleRecord=function(part){
            const btn=document.getElementById('record-btn-'+part);
            const textarea = document.getElementById('ai-text-'+part);
            const lbl = document.getElementById('record-label-'+part);"""
    
    content = content.replace(old_toggle_record_start, new_toggle_record_start)
    
    # Add speech recognition start/stop in toggleRecord
    old_toggle_logic = "if(recState[part]){\n                btn.classList.add('recording');\n                wf.classList.add('visible');\n                lbl.textContent='🔴 Recording Your Answer...';\n                lbl.style.color='#dc3545';\n            } else {\n                btn.classList.remove('recording');\n                wf.classList.remove('visible');\n                lbl.textContent='✓ Answer Recorded';\n                lbl.style.color='#28a745';\n            }"
    
    new_toggle_logic = """if(recState[part]){
                btn.classList.add('recording');
                wf.classList.add('visible');
                lbl.textContent='🔴 Recording... (speak to transcribe)';
                lbl.style.color='#dc3545';
                if(textarea){
                    textarea.placeholder='Listening... speak now';
                    textarea.classList.add('transcribing');
                    startSpeechRecognition(part);
                }
            } else {
                btn.classList.remove('recording');
                wf.classList.remove('visible');
                lbl.textContent='✓ Answer Recorded';
                lbl.style.color='#28a745';
                if(textarea){
                    textarea.classList.remove('transcribing');
                    stopSpeechRecognition(part);
                }
            }"""
    
    content = content.replace(old_toggle_logic, new_toggle_logic)
    
    # 10. Add AI review functions before </script> and speakingTestUtils.js
    common_js = get_common_ai_functions('p1')
    speech_rec_js = get_speech_recognition_code('p1')
    evaluation_js = get_ai_review_js(test_id, test_name, part_type, '1', total)
    
    all_js = '\n' + common_js + '\n' + speech_rec_js + '\n' + evaluation_js
    
    content = content.replace(
        '    </script>\n    <script src="../../js/speakingTestUtils.js',
        all_js + '    </script>\n    <script src="../../js/speakingTestUtils.js'
    )
    
    # 11. Ensure speakingTestUtils.js is included
    if 'speakingTestUtils.js' not in content:
        content = content.replace(
            '</body>',
            '    <script src="../../js/speakingTestUtils.js?v=1"></script>\n</body>'
        )
    
    if content != original:
        write_file(filepath, content)
        print(f"  ✓ Updated {filename}")
    else:
        print(f"  - No changes needed for {filename}")

def process_part2_file(filepath, filename):
    """Process a Part 2 speaking test file (single question with cue card)"""
    print(f"Processing {filename}...")
    
    content = read_file(filepath)
    original = content
    
    test_id, test_name, part_type, prefix, total = get_test_info(filepath)
    
    # 1. Add AI CSS before </style>
    ai_css = AI_CSS_STYLES + RESULTS_MODAL_CSS
    content = content.replace('</style>', ai_css + '    </style>')
    
    # 2. Find record section and add AI response section after it
    # For Part 2, the structure is different - it's after the cue card
    record_section_pattern = r'(</div>\s*<div class="card-footer">)'
    ai_html = get_ai_response_html('p2') + '\n            </div>\n            <div class="card-footer">'
    content = re.sub(record_section_pattern, ai_html, content, count=1)
    
    # 3. Add results modal before </body>
    results_modal = get_results_modal_html()
    content = content.replace('</body>', results_modal + '</body>')
    
    # 4. Modify finish button to call evaluateAllAnswers
    old_finish = "onclick=\"if(confirm('Finish Part 2?'))window.location.href='../index.html'\""
    new_finish = "onclick=\"if(confirm('Test complete! Get AI evaluation?')) evaluateAllAnswers();\""
    content = content.replace(old_finish, new_finish)
    
    # 5. Add getAuthToken and AI functions
    common_js = get_common_ai_functions('p2')
    speech_rec_js = get_speech_recognition_code('p2')
    evaluation_js = get_ai_review_js(test_id, test_name, part_type, '2', total)
    
    all_js = '\n' + common_js + '\n' + speech_rec_js + '\n' + evaluation_js
    
    # Find the script section before </body>
    content = content.replace(
        '    </script>\n</body>',
        all_js + '    </script>\n</body>'
    )
    
    # 6. Modify toggleRecord to integrate speech recognition
    # Find the toggleRecord function and add textarea and speech rec logic
    if 'const textarea' not in content:
        old_toggle = "window.toggleRecord = function(part) {\n            const btn = document.getElementById('record-btn-' + part);"
        new_toggle = """window.toggleRecord = function(part) {
            const btn = document.getElementById('record-btn-' + part);
            const textarea = document.getElementById('ai-text-' + part);
            const lbl = document.getElementById('record-label-' + part);"""
        content = content.replace(old_toggle, new_toggle)
        
        # Add speech recognition integration
        if 'startSpeechRecognition' not in content:
            old_rec_state = "if (recState[part]) {\n                btn.classList.add('recording');\n                wf.classList.add('visible');\n                lbl.textContent = '🔴 Recording Answer"
            new_rec_state = """if (recState[part]) {
                btn.classList.add('recording');
                wf.classList.add('visible');
                lbl.textContent = '🔴 Recording... (speak to transcribe)';
                if(textarea){
                    textarea.placeholder='Listening... speak now';
                    textarea.classList.add('transcribing');
                    startSpeechRecognition(part);
                }
            } else {
                btn.classList.remove('recording');
                wf.classList.remove('visible');
                lbl.textContent = '✓ Answer Recorded. Click Finish when ready.';
                lbl.style.color = '#28a745';
                if(textarea){
                    textarea.classList.remove('transcribing');
                    stopSpeechRecognition(part);
                }
            }"""
            # Only replace the if block, keep else as is
            content = content.replace(
                "lbl.textContent = '🔴 Recording Answer for Question " + prefix.upper() + "...';",
                "lbl.textContent = '🔴 Recording... (speak to transcribe)';\n                if(textarea){\n                    textarea.placeholder='Listening... speak now';\n                    textarea.classList.add('transcribing');\n                    startSpeechRecognition(part);\n                }"
            )
            
            content = content.replace(
                "lbl.textContent = '✓ Answer Recorded. Click Finish when ready.';",
                "lbl.textContent = '✓ Answer Recorded. Click Finish when ready.';\n                if(textarea){\n                    textarea.classList.remove('transcribing');\n                    stopSpeechRecognition(part);\n                }"
            )
    
    # 7. Ensure speakingTestUtils.js is included
    if 'speakingTestUtils.js' not in content:
        content = content.replace(
            '</body>',
            '    <script src="../../js/speakingTestUtils.js?v=1"></script>\n</body>'
        )
    
    if content != original:
        write_file(filepath, content)
        print(f"  ✓ Updated {filename}")
    else:
        print(f"  - No changes needed for {filename}")

def process_part3_file(filepath, filename):
    """Process a Part 3 speaking test file (similar structure to Part 1)"""
    # Part 3 is very similar to Part 1 but with 5 questions instead of 9
    print(f"Processing {filename}...")
    
    content = read_file(filepath)
    original = content
    
    test_id, test_name, part_type, prefix, total = get_test_info(filepath)
    
    # 1. Add AI CSS before </style>
    ai_css = AI_CSS_STYLES + RESULTS_MODAL_CSS
    content = content.replace('</style>', ai_css + '    </style>')
    
    # 2. Find record section and add AI response section after it
    record_section_pattern = r'(</div>\s*<div class="card-footer">)'
    ai_html = get_ai_response_html('p3') + '\n            </div>\n            <div class="card-footer">'
    content = re.sub(record_section_pattern, ai_html, content, count=1)
    
    # 3. Add results modal before </body>
    results_modal = get_results_modal_html()
    content = content.replace('</body>', results_modal + '</body>')
    
    # 4. Modify the script to expose globals
    content = re.sub(r'const P3_TOTAL = 5;', 'window.P3_TOTAL = 5; // Expose globally for AI evaluation', content)
    content = re.sub(r'const p3Answers = \{\};', 'window.p3Answers = {}; // Expose globally for AI evaluation', content)
    
    # Update references to use window.p3Answers
    content = content.replace('p3Answers[p3Current]', 'window.p3Answers[p3Current]')
    
    # 5. Add getQuestionText as window.getQuestionText (for Part 3)
    get_question_text = '''
    window.getQuestionText = function(qNum){
        const qBlock = document.getElementById('p3-q'+qNum);
        if(qBlock){
            const heading = qBlock.querySelector('.p3-topic-heading');
            const question = qBlock.querySelector('.p3-question');
            return (heading ? heading.textContent + ': ' : '') + (question ? question.textContent : '');
        }
        return '';
    }
    '''
    
    content = content.replace(
        '        async function saveTestCompletion()',
        '    ' + get_question_text + '''
        async function saveTestCompletion()'''
    )
    
    # 6. Add saveCurrentAnswer function and modify navigation
    save_current_answer = '''
        // Save current answer before navigating
        function saveCurrentAnswer(){
            const aiTextarea = document.getElementById('ai-text-p3');
            if (aiTextarea) {
                window.p3Answers[p3Current] = aiTextarea.value;
            }
        }
        
'''
    
    content = content.replace(
        '        window.p3Next = function(){',
        save_current_answer + '        window.p3Next = function(){\n            saveCurrentAnswer();'
    )
    
    content = content.replace(
        '        window.p3Prev = function(){',
        '        window.p3Prev = function(){\n            saveCurrentAnswer();'
    )
    
    # 7. Modify renderP3 to load saved answer
    old_render = "document.getElementById('record-label-p3').textContent = 'Tap to Record Your Answer';"
    new_render = """document.getElementById('record-label-p3').textContent = 'Tap to Record Your Answer';
            
            // Load saved answer for current question and hide results
            const aiTextarea = document.getElementById('ai-text-p3');
            const aiResults = document.getElementById('ai-results-p3');
            if (aiTextarea) aiTextarea.value = window.p3Answers[p3Current] || '';
            if (aiResults) aiResults.classList.remove('visible');"""
    content = content.replace(old_render, new_render)
    
    # 8. Modify finish logic
    old_finish = "else if(confirm('Test complete!')) window.location.href='../index.html';"
    new_finish = """else if(confirm('Test complete! Get AI evaluation for all answers?')){
                    saveCurrentAnswer();
                    evaluateAllAnswers();
                }"""
    content = content.replace(old_finish, new_finish)
    
    # 9. Modify toggleRecord to integrate speech recognition
    old_toggle = "window.toggleRecord = function(part){\n            const btn = document.getElementById('record-btn-' + part);"
    new_toggle = """window.toggleRecord = function(part){
            const btn = document.getElementById('record-btn-' + part);
            const textarea = document.getElementById('ai-text-' + part);"""
    content = content.replace(old_toggle, new_toggle)
    
    # Add speech rec logic
    content = content.replace(
        "lbl.textContent = '🔴 Recording Answer for Question ' + p3Current + '...';",
        "lbl.textContent = '🔴 Recording... (speak to transcribe)';\n            if(textarea){\n                textarea.placeholder='Listening... speak now';\n                textarea.classList.add('transcribing');\n                startSpeechRecognition(part);\n            }"
    )
    
    # 10. Add AI functions
    common_js = get_common_ai_functions('p3')
    speech_rec_js = get_speech_recognition_code('p3')
    evaluation_js = get_ai_review_js(test_id, test_name, part_type, '3', total)
    
    all_js = '\n' + common_js + '\n' + speech_rec_js + '\n' + evaluation_js
    
    content = content.replace(
        '    </script>\n</body>',
        all_js + '    </script>\n</body>'
    )
    
    # 11. Ensure speakingTestUtils.js is included
    if 'speakingTestUtils.js' not in content:
        content = content.replace(
            '</body>',
            '    <script src="../../js/speakingTestUtils.js?v=1"></script>\n</body>'
        )
    
    if content != original:
        write_file(filepath, content)
        print(f"  ✓ Updated {filename}")
    else:
        print(f"  - No changes needed for {filename}")

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking'
    
    # Process Part 1 tests (Sets 2-30, skipping Set 1 which is already done)
    print("\n=== Part 1 Tests ===")
    part1_files = sorted(glob.glob(os.path.join(base_dir, 'Part 1', 'Speaking-Part1-Set*.html')))
    for filepath in part1_files:
        filename = os.path.basename(filepath)
        if 'Set1.html' in filename:
            print(f"Skipping {filename} (already updated)")
            continue
        try:
            process_part1_file(filepath, filename)
        except Exception as e:
            print(f"  ✗ Error processing {filename}: {e}")
    
    # Process Part 2 tests
    print("\n=== Part 2 Tests ===")
    part2_files = sorted(glob.glob(os.path.join(base_dir, 'Part 2', 'Speaking-Part2-Set*.html')))
    for filepath in part2_files:
        filename = os.path.basename(filepath)
        try:
            process_part2_file(filepath, filename)
        except Exception as e:
            print(f"  ✗ Error processing {filename}: {e}")
    
    # Process Part 3 tests
    print("\n=== Part 3 Tests ===")
    part3_files = sorted(glob.glob(os.path.join(base_dir, 'Part 3', 'Speaking-Part3-Set*.html')))
    for filepath in part3_files:
        filename = os.path.basename(filepath)
        try:
            process_part3_file(filepath, filename)
        except Exception as e:
            print(f"  ✗ Error processing {filename}: {e}")
    
    print("\n=== Done! ===")

if __name__ == '__main__':
    main()
