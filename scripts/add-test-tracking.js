#!/usr/bin/env node
/**
 * Batch script to add test tracking to all IELTS test files
 */

const fs = require('fs');
const path = require('path');

const TESTS_DIR = '/home/ahror/Documents/IELTSPRACTICE2/Tests/practice';

// Track which files were modified
const modifiedFiles = [];
const skippedFiles = [];

/**
 * Add tracking to Speaking Part 1 files
 */
function updateSpeakingPart1(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has tracking
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    // Extract set number from filename
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    // Add tracking script before closing </body>
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="../../js/testTracker.js"></script>
    <script>
        // Test completion tracking
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'SPEAKING',
                testId: 'Speaking-Part1-Set${setNumber}',
                testName: 'Speaking Part 1 - Set ${setNumber}',
                skillArea: 'SPEAKING_PART_1',
                maxScore: 9.0,
                answersTotal: 12
            });
        }
        
        // Override the original p1Next to add tracking
        const originalP1Next = window.p1Next;
        window.p1Next = function() {
            if(recState.p1){
                toggleRecord('p1');
                setTimeout(()=>{
                    if(p1Current<P1_TOTAL){p1Current++;renderP1();}
                    else if(confirm('Test complete! Save your progress?')){
                        saveTestCompletion().then(() => {
                            window.location.href='../index.html';
                        });
                    }
                },300);
            } else {
                if(p1Current<P1_TOTAL){p1Current++;renderP1();}
                else if(confirm('Test complete! Save your progress?')){
                    saveTestCompletion().then(() => {
                        window.location.href='../index.html';
                    });
                }
            }
        };
    </script>`;
    
    // Insert before </body>
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Add tracking to Speaking Part 2 files
 */
function updateSpeakingPart2(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="../../js/testTracker.js"></script>
    <script>
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'SPEAKING',
                testId: 'Speaking-Part2-Set${setNumber}',
                testName: 'Speaking Part 2 - Set ${setNumber}',
                skillArea: 'SPEAKING_PART_2',
                maxScore: 9.0,
                answersTotal: 1
            });
        }
    </script>`;
    
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Add tracking to Speaking Part 3 files
 */
function updateSpeakingPart3(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="../../js/testTracker.js"></script>
    <script>
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'SPEAKING',
                testId: 'Speaking-Part3-Set${setNumber}',
                testName: 'Speaking Part 3 - Set ${setNumber}',
                skillArea: 'SPEAKING_PART_3',
                maxScore: 9.0,
                answersTotal: 6
            });
        }
    </script>`;
    
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Add tracking to Writing Task 1 files
 */
function updateWritingTask1(filePath, subfolder) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    const skillAreaMap = {
        'Graph | Chart | Table': 'WRITING_TASK_1_GRAPH',
        'Process | Diagram': 'WRITING_TASK_1_PROCESS',
        'Map': 'WRITING_TASK_1_MAP'
    };
    
    const skillArea = skillAreaMap[subfolder] || 'WRITING_TASK_1';
    const testIdPrefix = skillArea.replace(/_/g, '-').toLowerCase();
    
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="../../js/testTracker.js"></script>
    <script>
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'WRITING',
                testId: 'Writing-Task1-${subfolder.replace(/ |/g, '')}-Set${setNumber}',
                testName: 'Writing Task 1 - ${subfolder} - Set ${setNumber}',
                skillArea: '${skillArea}',
                maxScore: 9.0,
                answersTotal: 1
            });
        }
    </script>`;
    
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Add tracking to Writing Task 2 files
 */
function updateWritingTask2(filePath, subfolder) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    const skillAreaMap = {
        'Opinion Essay': 'WRITING_TASK_2_OPINION',
        'Discussion Essay': 'WRITING_TASK_2_DISCUSSION',
        'Problem Solution': 'WRITING_TASK_2_PROBLEM',
        'Advantages and Disadvantages': 'WRITING_TASK_2_ADVANTAGES',
        'Direct Questions': 'WRITING_TASK_2_DIRECT'
    };
    
    const skillArea = skillAreaMap[subfolder] || 'WRITING_TASK_2';
    
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="../../js/testTracker.js"></script>
    <script>
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'WRITING',
                testId: 'Writing-Part2-Set${setNumber}',
                testName: 'Writing Task 2 - ${subfolder} - Set ${setNumber}',
                skillArea: '${skillArea}',
                maxScore: 9.0,
                answersTotal: 1
            });
        }
    </script>`;
    
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Add tracking to Full Writing Test files
 */
function updateWritingFull(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="../js/testTracker.js"></script>
    <script>
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'WRITING',
                testId: 'All-Tasks-Set${setNumber}',
                testName: 'Full Writing Test - Set ${setNumber}',
                skillArea: 'WRITING_FULL',
                maxScore: 9.0,
                answersTotal: 2
            });
        }
    </script>`;
    
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Add tracking to Reading test files
 */
function updateReadingTest(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="js/testTracker.js"></script>
    <script>
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'READING',
                testId: 'Reading-Set${setNumber}',
                testName: 'Reading Test - Set ${setNumber}',
                skillArea: 'READING_COMPREHENSION',
                maxScore: 9.0,
                answersTotal: 40
            });
        }
    </script>`;
    
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Add tracking to Listening test files
 */
function updateListeningTest(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('saveTestCompletion') || content.includes('testTracker.js')) {
        skippedFiles.push(filePath);
        return;
    }
    
    const setMatch = path.basename(filePath).match(/Set(\d+)/);
    const setNumber = setMatch ? setMatch[1] : '1';
    
    const trackingCode = `
    <!-- Test Tracking -->
    <script src="js/testTracker.js"></script>
    <script>
        async function saveTestCompletion() {
            await window.saveTestCompletion({
                testType: 'LISTENING',
                testId: 'Listening-Set${setNumber}',
                testName: 'Listening Test - Set ${setNumber}',
                skillArea: 'LISTENING_COMPREHENSION',
                maxScore: 9.0,
                answersTotal: 40
            });
        }
    </script>`;
    
    content = content.replace('</body>', `${trackingCode}\n</body>`);
    fs.writeFileSync(filePath, content);
    modifiedFiles.push(filePath);
    console.log(`✅ Updated: ${filePath}`);
}

/**
 * Main function
 */
function main() {
    console.log('🔧 Adding test tracking to IELTS test files...\n');
    
    // Update Speaking Part 1 files
    const part1Dir = path.join(TESTS_DIR, 'Speaking/Part 1');
    if (fs.existsSync(part1Dir)) {
        const files = fs.readdirSync(part1Dir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateSpeakingPart1(path.join(part1Dir, file)));
    }
    
    // Update Speaking Part 2 files
    const part2Dir = path.join(TESTS_DIR, 'Speaking/Part 2');
    if (fs.existsSync(part2Dir)) {
        const files = fs.readdirSync(part2Dir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateSpeakingPart2(path.join(part2Dir, file)));
    }
    
    // Update Speaking Part 3 files
    const part3Dir = path.join(TESTS_DIR, 'Speaking/Part 3');
    if (fs.existsSync(part3Dir)) {
        const files = fs.readdirSync(part3Dir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateSpeakingPart3(path.join(part3Dir, file)));
    }
    
    // Update Writing Task 1 files
    const writingDir = path.join(TESTS_DIR, 'Writing');
    const task1Folders = ['Graph | Chart | Table', 'Process | Diagram', 'Map'];
    task1Folders.forEach(folder => {
        const folderPath = path.join(writingDir, folder);
        if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));
            files.forEach(file => updateWritingTask1(path.join(folderPath, file), folder));
        }
    });
    
    // Update Writing Task 2 files
    const task2Folders = ['Opinion Essay', 'Discussion Essay', 'Problem Solution', 'Advantages and Disadvantages', 'Direct Questions'];
    task2Folders.forEach(folder => {
        const folderPath = path.join(writingDir, folder);
        if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.html'));
            files.forEach(file => updateWritingTask2(path.join(folderPath, file), folder));
        }
    });
    
    // Update Full Writing Tests
    const allTasksDir = path.join(writingDir, 'All Tasks');
    if (fs.existsSync(allTasksDir)) {
        const files = fs.readdirSync(allTasksDir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateWritingFull(path.join(allTasksDir, file)));
    }
    
    // Update Reading tests
    const readingDir = path.join(TESTS_DIR, 'Reading');
    if (fs.existsSync(readingDir)) {
        const files = fs.readdirSync(readingDir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateReadingTest(path.join(readingDir, file)));
    }
    
    // Update Listening tests
    const listeningDir = path.join(TESTS_DIR, 'Listening');
    if (fs.existsSync(listeningDir)) {
        const files = fs.readdirSync(listeningDir).filter(f => f.endsWith('.html'));
        files.forEach(file => updateListeningTest(path.join(listeningDir, file)));
    }
    
    console.log(`\n✅ Modified ${modifiedFiles.length} files`);
    console.log(`⏭️  Skipped ${skippedFiles.length} files (already have tracking)`);
    
    if (skippedFiles.length > 0) {
        console.log('\nSkipped files:');
        skippedFiles.slice(0, 10).forEach(f => console.log(`  - ${path.basename(f)}`));
        if (skippedFiles.length > 10) {
            console.log(`  ... and ${skippedFiles.length - 10} more`);
        }
    }
}

main();
