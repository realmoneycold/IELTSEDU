import re

fpath = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/Part 1/Speaking-Part1-Set1.html'

with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

original = content

# 1. Add CSS styles for AI review before </style>
ai_css = '''
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
            padding: 20px;
            background: #f9f5ff;
            border-radius: 10px;
            border: 1px solid #e0d4f7;
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
            padding-bottom: 12px;
            margin-bottom: 12px;
            border-bottom: 2px solid #e0d4f7;
        }
        .ai-overall-label {
            font-size: 14px;
            font-weight: 700;
            color: #555;
        }
        .ai-overall-score {
            font-size: 24px;
            font-weight: 800;
            color: #7C3AED;
        }
        .ai-band-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .ai-band-row:last-child {
            border-bottom: none;
        }
        .ai-criteria-name {
            font-size: 13px;
            color: #666;
        }
        .ai-band-badge {
            background: #fff;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            color: #7C3AED;
            border: 1px solid #e0d4f7;
        }
        .ai-feedback-section {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e0d4f7;
        }
        .ai-feedback-heading {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #555;
            margin-bottom: 8px;
        }
        .ai-feedback-text {
            font-size: 13px;
            line-height: 1.6;
            color: #444;
        }
'''

content = content.replace('</style>', ai_css + '    </style>')

# 2. Add AI review HTML section after record-section
ai_html = '''
                <!-- AI Speaking Review -->
                <div class="ai-response-section">
                    <label class="ai-response-label">✍️ Type your answer here for AI Review</label>
                    <textarea class="ai-response-textarea" id="ai-text-p1" placeholder="Type your answer, or press the mic button above and speak — your words will appear here automatically..."></textarea>
                    <button class="ai-review-btn" id="ai-btn-p1" onclick="submitSpeakingReview('p1')">
                        🤖 Get AI Feedback
                    </button>
                    <div class="ai-results-panel" id="ai-results-p1"></div>
                </div>
'''

# Find the record-section closing div and add AI section after it
content = content.replace(
    '<span class="record-label" id="record-label-p1">Tap to Record Your Answer</span>\n                </div>',
    '<span class="record-label" id="record-label-p1">Tap to Record Your Answer</span>\n                </div>' + ai_html
)

# 3. Add AI review JavaScript before the closing </script> of the main IIFE
ai_js = '''
    // AI Speaking Review Functions
    function getAuthToken() {
        return localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('ielts_token') || '';
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function getCurrentQuestionText() {
        const activeBlock = document.querySelector('.question-block.active');
        if (activeBlock) {
            const heading = activeBlock.querySelector('.p1-topic-heading');
            const question = activeBlock.querySelector('.p1-question');
            return (heading ? heading.textContent + '\\n' : '') + (question ? question.textContent : '');
        }
        return '';
    }
    
    window.submitSpeakingReview = async function(part) {
        const textarea = document.getElementById('ai-text-' + part);
        const btn = document.getElementById('ai-btn-' + part);
        const resultsPanel = document.getElementById('ai-results-' + part);
        const text = textarea ? textarea.value.trim() : '';
        
        if (!text || text.length < 20) {
            alert('Please write at least 20 characters before submitting for AI review.');
            return;
        }
        
        const token = getAuthToken();
        if (!token) {
            alert('You need to be logged in to use AI review.');
            return;
        }
        
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="ai-loading"></span> Analyzing...';
        resultsPanel.classList.remove('visible');
        resultsPanel.innerHTML = '';
        
        const questionPrompt = getCurrentQuestionText();
        
        try {
            const res = await fetch('/api/ai/assess-speaking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ speakingText: text, partType: 'Part1', questionPrompt: questionPrompt })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'AI review failed');
            displaySpeakingResults(resultsPanel, data.assessment);
        } catch (err) {
            console.error('AI review error:', err);
            resultsPanel.innerHTML = '<p style="color:#e53935;font-size:13px;font-weight:600;">⚠️ ' + (err.message || 'Error. Try again.') + '</p>';
            resultsPanel.classList.add('visible');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };
    
    function displaySpeakingResults(panel, a) {
        const f = a.fluencyAndCoherence || {};
        const l = a.lexicalResource || {};
        const g = a.grammaticalRangeAndAccuracy || {};
        const p = a.pronunciation || {};
        const overall = a.overallBandRounded || a.overallScore || 'N/A';
        
        let html = '<div class="ai-overall-row"><span class="ai-overall-label">Overall Band</span><span class="ai-overall-score">' + overall + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Fluency & Coherence</span><span class="ai-band-badge">' + (f.score || f.band || 'N/A') + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Lexical Resource</span><span class="ai-band-badge">' + (l.score || l.band || 'N/A') + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Grammar</span><span class="ai-band-badge">' + (g.score || g.band || 'N/A') + '</span></div>';
        html += '<div class="ai-band-row"><span class="ai-criteria-name">Pronunciation</span><span class="ai-band-badge">' + (p.score || p.band || 'N/A') + '</span></div>';
        
        if (a.examinerNotes) {
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Examiner Notes</div><div class="ai-feedback-text">' + escapeHtml(a.examinerNotes) + '</div></div>';
        }
        if (a.strengths && a.strengths.length) {
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Strengths</div><div class="ai-feedback-text">' + a.strengths.map(function(s) { return '✅ ' + escapeHtml(s); }).join('<br>') + '</div></div>';
        }
        if (a.weaknesses && a.weaknesses.length) {
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Areas to Improve</div><div class="ai-feedback-text">' + a.weaknesses.map(function(w) { return '⚠️ ' + escapeHtml(w); }).join('<br>') + '</div></div>';
        }
        if (a.improvements && a.improvements.length) {
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Suggestions</div><div class="ai-feedback-text">' + a.improvements.map(function(i) { return '💡 ' + escapeHtml(i); }).join('<br>') + '</div></div>';
        }
        if (p.wordsToPractice && p.wordsToPractice.length) {
            html += '<div class="ai-feedback-section"><div class="ai-feedback-heading">Words to Practice</div><div class="ai-feedback-text">' + p.wordsToPractice.map(function(w) { return escapeHtml(w); }).join(', ') + '</div></div>';
        }
        
        panel.innerHTML = html;
        panel.classList.add('visible');
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
'''

# Find the last </script> before speakingTestUtils.js and add AI JS before it
content = content.replace(
    '    </script>\n    <script src="../../js/speakingTestUtils.js?v=1"></script>',
    ai_js + '    </script>\n    <script src="../../js/speakingTestUtils.js?v=1"></script>'
)

if content != original:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated Speaking-Part1-Set1.html with AI review functionality')
else:
    print('No changes made')
