#!/bin/bash
# Patch all reading test HTML files to expose calculateBand and add dashboard button

cd /home/ahror/Documents/IELTSPRACTICE2/Tests/practice/Reading || exit 1

for f in $(find . -name "*.html" -type f); do
    echo "Processing: $f"
    
    # 1. Add window.calculateBand = calculateBand after the function definition
    # Find the pattern: return (map[scaled] || 0.0).toFixed(1);\n        }\n\n        function showResultsModal
    # And insert window.calculateBand = calculateBand between } and function showResultsModal
    sed -i 's/return (map\[scaled\] || 0.0).toFixed(1);\n        }\n\n        function showResultsModal/return (map[scaled] || 0.0).toFixed(1);\n        }\n\n        window.calculateBand = calculateBand;\n\n        function showResultsModal/' "$f"
    
    # 2. Add Go to Dashboard button after results-summary div
    sed -i 's/<\/div>\n            <div id="results-details"/\n            <div class="results-actions" style="margin-top: 15px; text-align: center;">\n                <button onclick="window.location.href=\'\/dashboard.html\'" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">Finish \&amp; Go to Dashboard<\/button>\n            <\/div>\n            <\/div>\n            <div id="results-details"/' "$f"
    
    # 3. Add testTracker.js script before readingScoreSaver.js if not present
    if ! grep -q "testTracker.js" "$f"; then
        sed -i 's/<script src="..\/..\/js\/readingScoreSaver.js"><\/script>/<script src="..\/..\/js\/testTracker.js"><\/script>\n    <script src="..\/..\/js\/readingScoreSaver.js"><\/script>/' "$f"
    fi
done

echo "Done patching reading tests!"
