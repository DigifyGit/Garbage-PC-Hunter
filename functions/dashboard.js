'use strict';

const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, 'public');

try {
    // Attempt to create the public directory if it doesn't already exist
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
        console.log('Public directory created at:', publicDir);
    } else {
        console.log('Public directory already exists at:', publicDir);
    }
} catch (error) {
    console.error('Error creating public directory:', error);
}
