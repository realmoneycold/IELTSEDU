#!/usr/bin/env python3
"""
Add missing AI review JavaScript functions to all Part 2 speaking test files.
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

def get_test_info_from_file(filepath):
    """Extract test ID and name from file content"""
    content = read_file(filepath)
    
    # Find testId and testName in saveTestCompletion call
    test_id_match = re.search(r"testId:\s*'([^']+)'", content)
    test_name_match = re.search(r"testName:\s*'([^']+)'", content)
    
    test_id = test_id_match.group(1) if test_id_match else 'Speaking-Part2-Set1'
    test_name = test_name_match.group(1) if test_name_match else 'Speaking Part 2 - Set 1'
    
    # Extract set number
    set_match = re.search(r'Set(\d+)', os.path.basename(filepath))
    set_num = set_match.group(1) if set_match else '1'
    
    return test_id, test_name, set_num

def get_ai_functions_js(test_id, test_name, set_num):
    """Generate AI review JavaScript functions for Part 2"""
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
        const cueTask = document.querySelector('.cue-task');
        return cueTask ? cueTask.textContent : '';
    }}

    window.submitSpeakingReview = async function(part) {{
        const textarea = document.getElementById('ai-text-' + part);
        const btn = document.getElementById('ai-btn-' + part);
        const resultsPanel = document.getElementById('ai-results-' + part);
        const text = textarea ? textarea.value.trim() : '';

        if (!text || text.length < 20) {{
            alert('Please write at least 20 characters before submitting for AI review.');
            return;
        }}

        const token = getAuthToken();
        if (!token) {{
            alert('You need to be logged in to use AI review.');
            return;
        }}

        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="ai-loading"></span> Analyzing...';
        resultsPanel.classList.remove('visible');
        resultsPanel.innerHTML = '';

        const questionPrompt = getCurrentQuestionText();

        try {{
            const res = await fetch('/api/ai/assess-speaking', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }},
                body: JSON.stringify({{ speakingText: text, partType: 'Part2', questionPrompt: questionPrompt }})
            }});
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'AI review failed');
            displaySpeakingResults(resultsPanel, data.assessment);
        }} catch (err) {{
            console.error('AI review error:', err);
            resultsPanel.innerHTML = '<p style="color:#e53935;font-size:13px;font-weight:600;">⚠️ ' + (err.message || 'Error. Try again.') + '</p>';
            resultsPanel.classList.add('visible');
        }} finally {{
            btn.disabled = false;
            btn.innerHTML = originalText;
        }}
    }};

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

        if (a.examinerNotes) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Examiner Notes</div><div class="ai-feedback-text">' + escapeHtml(a.examinerNotes) + '</div></div>';
        }}
        if (a.strengths && a.strengths.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Strengths</div><div class="ai-feedback-text">' + a.strengths.map(function(s) {{ return '✅ ' + escapeHtml(s); }}).join('<br>') + '</div></div>';
        }}
        if (a.weaknesses && a.weaknesses.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Areas to Improve</div><div class="ai-feedback-text">' + a.weaknesses.map(function(w) {{ return '⚠️ ' + escapeHtml(w); }}).join('<br>') + '</div></div>';
        }}
        if (a.improvements && a.improvements.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Suggestions</div><div class="ai-feedback-text">' + a.improvements.map(function(i) {{ return '💡 ' + escapeHtml(i); }}).join('<br>') + '</div></div>';
        }}
        if (p.wordsToPractice && p.wordsToPractice.length) {{
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Words to Practice</div><div class="ai-feedback-text">' + p.wordsToPractice.map(function(w) {{ return escapeHtml(w); }}).join(', ') + '</div></div>';
        }}

        panel.innerHTML = html;
        panel.classList.add('visible');
        panel.scrollIntoView({{ behavior: 'smooth', block: 'nearest' }});
    }}

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

    // Evaluate answer with AI for Part 2
    let aiResults = null;

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
        const answer = document.getElementById('ai-text-p2')?.value || '';

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
                '    'Authorization': 'Bearer ' + token
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
                window.autoSaveSpeakingScore && window.autoSaveSpeakingScore(null, band);

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
        const answer = document.getElementById('ai-text-p2')?.value || '';
        localStorage.setItem('speaking_p2_set{set_num}_answer', answer);
        if(aiResults) {{
            localStorage.setItem('speaking_p2_set{set_num}_ai_results', JSON.stringify(aiResults));
        }}

        await saveTestCompletion();

        if(overallBand && overallBand !== '—'){{
            window.saveSpeakingAndGoToDashboard && window.saveSpeakingAndGoToDashboard(null, overallBand, 'S_P2_{set_num.zfill(2)}', '{test_name}');
        }} else {{
            window.finishSpeakingTest && window.finishSpeakingTest();
        }}
    }};
    </script>
'''

def fix_file(filepath):
    """Fix a Part 2 file by adding AI review functions"""
    content = read_file(filepath)
    original = content
    
    # Check if already has submitSpeakingReview
    if 'submitSpeakingReview' in content:
        return False, "Already has submitSpeakingReview"
    
    # Get test info
    test_id, test_name, set_num = get_test_info_from_file(filepath)
    
    # Generate AI functions
    ai_js = get_ai_functions_js(test_id, test_name, set_num)
    
    # Replace the closing </script> of the first script block
    # Look for pattern: })();
    </script>
    
    # Test Tracking
    old_pattern = "    })();\n    </script>\n\n    <!-- Test Tracking -->"
    if old_pattern in content:
        content = content.replace(old_pattern, ai_js + "\n\n    <!-- Test Tracking -->")
    else:
        # Try another pattern
        old_pattern2 = "})();\n    </script>\n\n    <!-- Test Tracking -->"
        if old_pattern2 in content:
            content = content.replace(old_pattern2, ai_js + "\n\n    <!-- Test Tracking -->")
        else:
            return False, "Could not find insertion point"
    
    if content != original:
        write_file(filepath, content)
        return True, "Fixed"
    return False, "No changes"

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/Part 2'
    
    files = sorted(glob.glob(os.path.join(base_dir, 'Speaking-Part2-Set*.html')))
    
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
