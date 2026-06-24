#!/usr/bin/env python3
"""
Add missing AI review JavaScript functions to Part 3 files.
"""

import os
import glob

def read_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def write_file(filepath, content):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def get_ai_functions_js():
    """Generate the AI review JavaScript functions for Part 3"""
    return '''

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
        if(!activeBlock) return '';
        const heading = activeBlock.querySelector('.p3-topic-heading');
        const question = activeBlock.querySelector('.p3-question');
        return (heading ? heading.textContent + ': ' : '') + (question ? question.textContent : '');
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
                body: JSON.stringify({ speakingText: text, partType: 'Part3', questionPrompt: questionPrompt })
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

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecs = {};

    function startSpeechRecognition(part) {
        if (!SpeechRecognition) return;
        const textarea = document.getElementById('ai-text-' + part);
        if (!textarea) return;

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        let finalTranscript = '';

        rec.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalTranscript += t + ' ';
                else interim += t;
            }
            textarea.value = finalTranscript + interim;
            textarea.classList.add('transcribing');
        };

        rec.onerror = (e) => {
            console.warn('Speech error:', e.error);
            textarea.placeholder = 'Mic blocked — type instead';
        };

        rec.onend = () => {
            textarea.classList.remove('transcribing');
            if (recState[part]) startSpeechRecognition(part);
        };

        speechRecs[part] = rec;
        try { rec.start(); } catch(e) { console.warn('Speech start failed:', e); }
    }

    function stopSpeechRecognition(part) {
        const rec = speechRecs[part];
        if (rec) {
            rec.stop();
            rec.abort();
            delete speechRecs[part];
        }
    }
    </script>'''

def fix_file(filepath):
    """Add AI functions to a file if missing"""
    content = read_file(filepath)
    original = content
    
    # Check if file already has the AI function
    if 'function getAuthToken()' in content:
        return False, "Already has AI functions"
    
    ai_js = get_ai_functions_js()
    
    # Find the insertion point - after "})();" and before "</script>"
    # The actual pattern in Part 3 files is:
    #         renderP3();
    #         renderTimer();
    #     })();
    #     </script>
    
    old_pattern = "        renderP3();\n        renderTimer();\n    })();\n    </script>"
    
    if old_pattern in content:
        new_content = content.replace(old_pattern, "        renderP3();\n        renderTimer();\n    })();" + ai_js)
        write_file(filepath, new_content)
        return True, "Fixed"
    
    return False, "Pattern not found"

def main():
    base_dir = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/Part 3'
    
    files = sorted(glob.glob(os.path.join(base_dir, 'Speaking-Part3-Set*.html')))
    
    fixed_count = 0
    for filepath in files:
        filename = os.path.basename(filepath)
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
