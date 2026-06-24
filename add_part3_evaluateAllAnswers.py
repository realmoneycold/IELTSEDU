#!/usr/bin/env python3
"""
Add missing evaluateAllAnswers function to all Part 3 files.
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
    """Extract test info from file"""
    content = read_file(filepath)
    
    # Extract set number
    set_match = re.search(r'Set(\d+)', os.path.basename(filepath))
    set_num = set_match.group(1) if set_match else '1'
    
    # Get test name from saveTestCompletion
    test_name_match = re.search(r"testName:\s*'([^']+)'", content)
    test_name = test_name_match.group(1) if test_name_match else f'Speaking Part 3 - Set {set_num}'
    
    return set_num, test_name

def get_evaluateAllAnswers_js(set_num, test_name):
    """Generate the evaluateAllAnswers JavaScript function for Part 3"""
    return f'''

    // Store AI results for each question
    const aiResults = {{}};

    // Evaluate all answers with AI
    async function evaluateAllAnswers(){{
        const resultsOverlay = document.getElementById('resultsOverlay');
        const resultsBody = document.getElementById('resultsBody');
        const overallScoreEl = document.getElementById('resultsOverallScore');

        resultsOverlay.classList.add('visible');
        resultsBody.innerHTML = '<div class="results-loading"><div class="results-loading-spinner"></div><p>Analyzing all your answers with AI...<br><small>Evaluating Question 1 of ' + window.P3_TOTAL + '</small></p></div>';
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
        for(let i=1; i<=window.P3_TOTAL; i++){{
            if(window.p3Answers[i] && window.p3Answers[i].trim()) answeredCount++;
        }}

        // Evaluate each question
        for(let i=1; i<=window.P3_TOTAL; i++){{
            const answer = window.p3Answers[i] || '';
            const questionText = window.getQuestionText(i);

            if(!answer.trim()){{
                resultsHtml += '<div class="results-question-block">';
                resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                resultsHtml += '<div class="results-empty" style="color:#999;font-style:italic;">No answer provided (skipped)</div>';
                resultsHtml += '</div>';
                // Update progress
                resultsBody.innerHTML = resultsHtml + '<div class="results-loading" style="margin-top:20px;"><div class="results-loading-spinner"></div><p>Evaluating Question ' + (i+1) + ' of ' + window.P3_TOTAL + '<br><small>' + evaluatedCount + ' of ' + answeredCount + ' answers evaluated</small></p></div>';
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
                        partType: 'Part3',
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
            const nextQ = i < window.P3_TOTAL ? i + 1 : 'Done';
            const progressMsg = nextQ === 'Done' ? 'Complete!' : 'Evaluating Question ' + nextQ + ' of ' + window.P3_TOTAL;
            resultsBody.innerHTML = resultsHtml + '<div class="results-loading" style="margin-top:20px;"><div class="results-loading-spinner"></div><p>' + progressMsg + '<br><small>' + evaluatedCount + ' of ' + answeredCount + ' answers evaluated</small></p></div>';
        }}

        // Calculate overall band
        let overallBand = '—';
        if(bandCount > 0){{
            overallBand = (totalBand / bandCount).toFixed(1);
            overallScoreEl.textContent = overallBand;

            // Save the overall result
            window.autoSaveSpeakingScore && window.autoSaveSpeakingScore(null, overallBand);
        }} else {{
            overallScoreEl.textContent = '—';
        }}

        // Final results without loading spinner
        let summaryText = '';
        if(bandCount > 0){{
            summaryText = '<div style="text-align:center;margin:20px 0;padding:15px;background:#f0fdf4;border-radius:8px;"><strong style="color:#10B981;">' + evaluatedCount + ' answers evaluated</strong><br>Based on ' + bandCount + ' scored answers<br>Skipped: ' + (window.P3_TOTAL - answeredCount) + ' questions</div>';
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
        localStorage.setItem('speaking_p3_set{set_num}_answers', JSON.stringify(window.p3Answers));
        localStorage.setItem('speaking_p3_set{set_num}_ai_results', JSON.stringify(aiResults));

        await saveTestCompletion();

        if(overallBand && overallBand !== '—'){{
            window.saveSpeakingAndGoToDashboard && window.saveSpeakingAndGoToDashboard(null, overallBand, 'S_P3_{set_num.zfill(2)}', '{test_name}');
        }} else {{
            window.finishSpeakingTest && window.finishSpeakingTest();
        }}
    }};
'''

def fix_file(filepath):
    """Add evaluateAllAnswers function to a Part 3 file"""
    content = read_file(filepath)
    original = content
    
    # Check if already has evaluateAllAnswers
    if 'async function evaluateAllAnswers()' in content:
        return False, "Already has evaluateAllAnswers"
    
    set_num, test_name = get_test_info(filepath)
    js_code = get_evaluateAllAnswers_js(set_num, test_name)
    
    # Find the insertion point - after stopSpeechRecognition and before </script>
    # Pattern: "    function stopSpeechRecognition(part) { ... }\n    </script>"
    
    old_pattern = "    function stopSpeechRecognition(part) {\n        const rec = speechRecs[part];\n        if (rec) {\n            rec.stop();\n            rec.abort();\n            delete speechRecs[part];\n        }\n    }\n    </script>"
    
    if old_pattern in content:
        new_content = content.replace(old_pattern, "    function stopSpeechRecognition(part) {\n        const rec = speechRecs[part];\n        if (rec) {\n            rec.stop();\n            rec.abort();\n            delete speechRecs[part];\n        }\n    }" + js_code + "\n    </script>")
        write_file(filepath, new_content)
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
