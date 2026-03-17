// Improved error handling and proper path resolution for the public directory output

const path = require('path');
const fs = require('fs');

function outputToPublicDirectory(data) {
    const publicDir = path.resolve(__dirname, 'public');
    const filePath = path.join(publicDir, 'output.json');

    // Ensure public directory exists
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFile(filePath, JSON.stringify(data), 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('File has been saved to', filePath);
    });
}