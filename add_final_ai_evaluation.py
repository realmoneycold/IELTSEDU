import re

fpath = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/Part 1/Speaking-Part1-Set1.html'

with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

original = content

# 1. Add Results Modal CSS before </style>
results_css = '''
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

content = content.replace('</style>', results_css + '    </style>')

# 2. Add Results Modal HTML before </body>
results_modal_html = '''
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

content = content.replace('</body>', results_modal_html + '</body>')

# 3. Add getQuestionText function and update finish logic
# Find the saveTestCompletion function and add getQuestionText before it
get_question_text_func = '''
    // Get question text by number
    function getQuestionText(qNum){
        const qBlock = document.getElementById('p1-q'+qNum);
        if(qBlock){
            const heading = qBlock.querySelector('.p1-topic-heading');
            const question = qBlock.querySelector('.p1-question');
            return (heading ? heading.textContent + ': ' : '') + (question ? question.textContent : '');
        }
        return '';
    }
    
'''

# Find where saveTestCompletion starts and insert before it
content = content.replace(
    '        // Test tracking function',
    get_question_text_func + '        // Test tracking function'
)

# 4. Add evaluateAllAnswers function before the closing </script>
evaluate_all_func = '''
    // Store AI results for each question
    const aiResults = {};
    
    // Evaluate all answers with AI
    async function evaluateAllAnswers(){
        const resultsOverlay = document.getElementById('resultsOverlay');
        const resultsBody = document.getElementById('resultsBody');
        const overallScoreEl = document.getElementById('resultsOverallScore');
        
        resultsOverlay.classList.add('visible');
        resultsBody.innerHTML = '<div class="results-loading"><div class="results-loading-spinner"></div><p>Analyzing all your answers with AI...</p></div>';
        overallScoreEl.textContent = '—';
        
        const token = getAuthToken();
        if(!token){
            resultsBody.innerHTML = '<p style="color:#e53935;text-align:center;">You need to be logged in to use AI evaluation.</p>';
            return;
        }
        
        let totalBand = 0;
        let bandCount = 0;
        let resultsHtml = '';
        
        // Evaluate each question
        for(let i=1; i<=P1_TOTAL; i++){
            const answer = p1Answers[i] || '';
            const questionText = getQuestionText(i);
            
            if(!answer.trim()){
                resultsHtml += '<div class="results-question-block">';
                resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                resultsHtml += '<div class="results-empty">No answer provided</div>';
                resultsHtml += '</div>';
                continue;
            }
            
            try{
                const res = await fetch('/api/ai/assess-speaking', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': 'Bearer ' + token 
                    },
                    body: JSON.stringify({ 
                        speakingText: answer, 
                        partType: 'Part1', 
                        questionPrompt: questionText 
                    })
                });
                const data = await res.json();
                
                if(data.success && data.assessment){
                    const a = data.assessment;
                    const band = parseFloat(a.overallBandRounded || a.overallScore || 0);
                    aiResults[i] = a;
                    
                    if(!isNaN(band) && band > 0){
                        totalBand += band;
                        bandCount++;
                    }
                    
                    resultsHtml += '<div class="results-question-block">';
                    resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                    resultsHtml += '<div class="results-answer-text">' + escapeHtml(answer.substring(0, 100) + (answer.length > 100 ? '...' : '')) + '</div>';
                    resultsHtml += '<div class="results-ai-band">Band: ' + band + '</div>';
                    resultsHtml += '</div>';
                } else {
                    resultsHtml += '<div class="results-question-block">';
                    resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                    resultsHtml += '<div class="results-answer-text">' + escapeHtml(answer.substring(0, 100)) + '...</div>';
                    resultsHtml += '<div style="color:#e53935;">AI evaluation failed</div>';
                    resultsHtml += '</div>';
                }
            } catch(err){
                console.error('AI evaluation error for Q' + i, err);
                resultsHtml += '<div class="results-question-block">';
                resultsHtml += '<div class="results-question-title">Question ' + i + '</div>';
                resultsHtml += '<div class="results-answer-text">' + escapeHtml(answer.substring(0, 100)) + '...</div>';
                resultsHtml += '<div style="color:#e53935;">Error: ' + escapeHtml(err.message) + '</div>';
                resultsHtml += '</div>';
            }
            
            // Update body with current progress
            resultsBody.innerHTML = resultsHtml;
        }
        
        // Calculate overall band
        let overallBand = '—';
        if(bandCount > 0){
            overallBand = (totalBand / bandCount).toFixed(1);
            overallScoreEl.textContent = overallBand;
            
            // Save the overall result
            window.autoSaveSpeakingScore(null, overallBand);
        } else {
            overallScoreEl.textContent = '—';
        }
    }
    
    window.closeResults = function(){
        document.getElementById('resultsOverlay').classList.remove('visible');
    };
    
    window.finishTestWithAI = async function(){
        const overallScoreEl = document.getElementById('resultsOverallScore');
        const overallBand = overallScoreEl.textContent !== '—' ? overallScoreEl.textContent : null;
        
        // Save all answers to localStorage for reference
        localStorage.setItem('speaking_p1_set1_answers', JSON.stringify(p1Answers));
        localStorage.setItem('speaking_p1_set1_ai_results', JSON.stringify(aiResults));
        
        await saveTestCompletion();
        
        if(overallBand && overallBand !== '—'){
            window.saveSpeakingAndGoToDashboard(null, overallBand, 'S_P1_01', 'Speaking Part 1 - Set 1');
        } else {
            window.finishSpeakingTest();
        }
    };
'''

# Add before the closing </script>
content = content.replace(
    '    </script>\n    <script src="../../js/speakingTestUtils.js?v=1"></script>',
    evaluate_all_func + '    </script>\n    <script src="../../js/speakingTestUtils.js?v=1"></script>'
)

# 5. Update the finish test confirmation to use evaluateAllAnswers
# Find the finish logic in p1Next
old_finish = """else if(confirm('Test complete!')){
                        saveTestCompletion().then(() => {
                            window.finishSpeakingTest();
                        });
                    }"""

new_finish = """else if(confirm('Test complete! Get AI evaluation for all answers?')){
                        saveCurrentAnswer();
                        evaluateAllAnswers();
                    }"""

content = content.replace(old_finish, new_finish, 1)  # Replace first occurrence

# Also replace the second occurrence
content = content.replace(old_finish, new_finish, 1)

if content != original:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated Speaking-Part1-Set1.html with final AI evaluation')
else:
    print('No changes made')
