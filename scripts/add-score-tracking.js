#!/usr/bin/env node
/**
 * Add score calculation to Listening and Reading tests
 */

const fs = require('fs');
const path = require('path');

const TESTS_DIR = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice';

const modifiedFiles = [];
const skippedFiles = [];

function updateListeningTest(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has score tracking
    if (content.includes('saveTestWithScore') || content.includes('scoreCalculator.js')) {
        skippedFiles.push(filePath);
        return;
    }

    // Extract set number from filename
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';

    // Add score tracking script before </body>
    const trackingCode = `
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
            
            const totalQuestions = 40; // Standard IELTS Listening has 40 questions
            
            // Save with extracted score
            console.log('[ScoreCalc] Saving test with score:', correctCount, '/', totalQuestions);
            await window.saveTestWithScore({
                testType: 'LISTENING',
                testId: 'Listening-Set${setNumber}',
                testName: 'Listening Test - Set ${setNumber}',
                skillArea: 'LISTENING_COMPREHENSION',
                correct: correctCount,
                total: totalQuestions,
                timeSpent: Math.floor((Date.now() - window.testStartTime) / 1000)
            });
            
            return result;
        };
    </script>`;

    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated Listening: ${path.basename(filePath)} (will track ${40} questions)`);
}

function updateReadingTest(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestWithScore') || content.includes('scoreCalculator.js')) {
        skippedFiles.push(filePath);
        return;
    }

    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';

    const trackingCode = `
    <!-- Score Tracking -->
    <script src="js/scoreCalculator.js"></script>
    <script>
        window.testStartTime = Date.now();
        
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
            
            // Save with extracted score
            console.log('[ScoreCalc] Saving test with score:', correctCount, '/40');
            await window.saveTestWithScore({
                testType: 'READING',
                testId: 'Reading-Set${setNumber}',
                testName: 'Reading Test - Set ${setNumber}',
                skillArea: 'READING_COMPREHENSION',
                correct: correctCount,
                total: 40,
                timeSpent: Math.floor((Date.now() - window.testStartTime) / 1000)
            });
            
            return result;
        };
    </script>`;

    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated Reading: ${path.basename(filePath)}`);
}

function main() {
    console.log('🔧 Adding score tracking to IELTS tests...\n');

    // Update Listening tests
    const listeningDir = path.join(TESTS_DIR, 'Listening/Full');
    if (fs.existsSync(listeningDir)) {
        const files = fs.readdirSync(listeningDir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateListeningTest(path.join(listeningDir, file)));
    }

    // Update Reading tests
    const readingDir = path.join(TESTS_DIR, 'Reading');
    if (fs.existsSync(readingDir)) {
        const files = fs.readdirSync(readingDir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateReadingTest(path.join(readingDir, file)));
    }

    console.log(`\n✅ Modified ${modifiedFiles.length} files`);
    console.log(`⏭️  Skipped ${skippedFiles.length} files (already have tracking)`);
}

main();
