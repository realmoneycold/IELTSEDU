#!/usr/bin/env node
/**
 * Fix score calculation in existing Listening and Reading tests
 * Updates the tracking code to extract score from DOM instead of relying on local variable
 */

const fs = require('fs');
const path = require('path');

const TESTS_DIR = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice';

const fixedFiles = [];
const skippedFiles = [];

function fixTrackingCode(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has the buggy tracking code (looks for the pattern with typeof score)
    if (!content.includes('typeof score !== \'undefined\' ? score : 0')) {
        skippedFiles.push(filePath);
        return;
    }

    // Extract test type and set number from existing code
    const testTypeMatch = content.match(/testType:\s*['"](LISTENING|READING)['"]/);
    const testType = testTypeMatch ? testTypeMatch[1] : 'LISTENING';
    
    const setMatch = content.match(/testId:\s*['"](Listening|Reading)-Set(\d+)['"]/);
    const setNumber = setMatch ? setMatch[2] : '1';

    // Remove the old buggy tracking code (everything between <!-- Score Tracking --> and </script> before </body>)
    const oldTrackingPattern = /\s*<!-- Score Tracking -->[\s\S]*?<\/script>\s*(?=<\/body>)/;
    content = content.replace(oldTrackingPattern, '');

    // Create new fixed tracking code
    const newTrackingCode = `
    <!-- Score Tracking -->
    <script src="js/scoreCalculator.js"></script>
    <script>
        // Store test start time
        window.testStartTime = Date.now();
        
        // Override checkAnswers to save score
        const originalCheckAnswers = checkAnswers;
        checkAnswers = async function() {
            // Call original function first (this calculates and displays the score)
            const result = originalCheckAnswers();
            
            // Extract score from the DOM (the original function stores score in a local variable)
            // The score is displayed in format: "You scored X out of 40 (Band Y)."
            let correctCount = 0;
            const scoreSummary = document.getElementById('score-summary');
            if (scoreSummary && scoreSummary.textContent) {
                const match = scoreSummary.textContent.match(/scored\\s+(\\d+)\\s+out\\s+of/);
                if (match) {
                    correctCount = parseInt(match[1], 10);
                    console.log('[ScoreCalc] Extracted score from DOM:', correctCount);
                } else {
                    console.warn('[ScoreCalc] Could not extract score from:', scoreSummary.textContent);
                }
            }
            
            const totalQuestions = 40; // Standard IELTS test has 40 questions
            
            // Save with extracted score
            console.log('[ScoreCalc] Saving test with score:', correctCount, '/', totalQuestions);
            await window.saveTestWithScore({
                testType: '${testType}',
                testId: '${testType === 'LISTENING' ? 'Listening' : 'Reading'}-Set${setNumber}',
                testName: '${testType === 'LISTENING' ? 'Listening' : 'Reading'} Test - Set ${setNumber}',
                skillArea: '${testType === 'LISTENING' ? 'LISTENING_COMPREHENSION' : 'READING_COMPREHENSION'}',
                correct: correctCount,
                total: totalQuestions,
                timeSpent: Math.floor((Date.now() - window.testStartTime) / 1000)
            });
            
            return result;
        };
    </script>`;

    content = content.replace('</body>', `${newTrackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    fixedFiles.push(filePath);
    console.log(`✅ Fixed ${testType} test: ${path.basename(filePath)} (Set ${setNumber})`);
}

function main() {
    console.log('🔧 Fixing score tracking in IELTS tests...\n');

    // Fix Listening tests
    const listeningDir = path.join(TESTS_DIR, 'Listening/Full');
    if (fs.existsSync(listeningDir)) {
        const files = fs.readdirSync(listeningDir).filter(f => f.endsWith('.html'));
        files.forEach(file => fixTrackingCode(path.join(listeningDir, file)));
    }

    // Fix Reading tests
    const readingDir = path.join(TESTS_DIR, 'Reading');
    if (fs.existsSync(readingDir)) {
        const files = fs.readdirSync(readingDir).filter(f => f.endsWith('.html'));
        files.forEach(file => fixTrackingCode(path.join(readingDir, file)));
    }

    console.log(`\n✅ Fixed ${fixedFiles.length} files`);
    console.log(`⏭️  Skipped ${skippedFiles.length} files (no buggy code found)`);
    
    if (fixedFiles.length > 0) {
        console.log('\n📋 Fixed files:');
        fixedFiles.forEach(f => console.log(`   - ${path.basename(f)}`));
    }
}

main();
