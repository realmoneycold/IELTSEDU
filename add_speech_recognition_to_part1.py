import re

fpath = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Speaking/Part 1/Speaking-Part1-Set1.html'

with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

original = content

# 1. Add CSS for transcribing state after the waveform styles
ai_css_addition = '''
        .ai-response-textarea.transcribing {
            border-color: #10B981;
            background: #f0fdf4;
            animation: pulseBorder 1.5s infinite;
        }
        @keyframes pulseBorder {
            0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
            70%  { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
            100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
'''

# Find the spot after waveform-bar styles
content = content.replace(
    '.waveform-bar { width: 4px; background: #e53935; border-radius: 2px; }',
    '.waveform-bar { width: 4px; background: #e53935; border-radius: 2px; }' + ai_css_addition
)

# 2. Add speech recognition code after recState declaration
speech_rec_code = '''
        const speechRecs = {}; // part -> recognition instance
        
        // ── SPEECH RECOGNITION SETUP ───────────────────────────────
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        function startSpeechRecognition(part) {
            if (!SpeechRecognition) return; // browser unsupported
            const textarea = document.getElementById(`ai-text-${part}`);
            if (!textarea) return;
            
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';
            
            let finalTranscript = textarea.value ? textarea.value.trim() + ' ' : '';
            
            rec.onresult = function(event) {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }
                textarea.value = (finalTranscript + interimTranscript).trim();
            };
            
            rec.onerror = function(event) {
                console.warn('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    const label = document.getElementById(`record-label-${part}`);
                    if (label) label.textContent = 'Mic blocked — type instead';
                }
            };
            
            rec.onend = function() {
                // If still "recording" UI state, restart recognition (browser may stop after pause)
                if (recState[part]) {
                    try { rec.start(); } catch(e) {}
                }
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
'''

# Add after recState declaration
content = content.replace(
    "const recState = {'p1': false};",
    "const recState = {'p1': false};" + speech_rec_code
)

# 3. Update the toggleRecord function
old_toggle = '''window.toggleRecord=function(part){
            const btn=document.getElementById('record-btn-'+part);
            const wf=document.getElementById('waveform-'+part);
            const lbl=document.getElementById('record-label-'+part);
            recState[part]=!recState[part];
            if(recState[part]){
                btn.classList.add('recording');
                wf.classList.add('visible');
                lbl.textContent='🔴 Recording Answer for Question '+p1Current+'...';
                lbl.style.color='#dc3545';
            } else {
                btn.classList.remove('recording');
                wf.classList.remove('visible');
                lbl.textContent='✓ Answer Recorded. Click Next to continue.';
                lbl.style.color='#28a745';
            }
        };'''

new_toggle = '''window.toggleRecord=function(part){
            const btn=document.getElementById('record-btn-'+part);
            const wf=document.getElementById('waveform-'+part);
            const lbl=document.getElementById('record-label-'+part);
            const textarea = document.getElementById(`ai-text-${part}`);
            
            recState[part]=!recState[part];
            
            if(recState[part]){
                btn.classList.add('recording');
                wf.classList.add('visible');
                lbl.textContent='🔴 Recording... (speak to transcribe)';
                lbl.style.color='#dc3545';
                if (textarea) textarea.classList.add('transcribing');
                startSpeechRecognition(part);
            } else {
                btn.classList.remove('recording');
                wf.classList.remove('visible');
                lbl.textContent='✓ Answer Recorded. Click Next to continue.';
                lbl.style.color='#28a745';
                if (textarea) textarea.classList.remove('transcribing');
                stopSpeechRecognition(part);
            }
        };'''

content = content.replace(old_toggle, new_toggle)

if content != original:
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated Speaking-Part1-Set1.html with speech recognition')
else:
    print('No changes made - checking what did not match...')
    # Debug
    if old_toggle not in original:
        print('toggleRecord function not found as expected')
