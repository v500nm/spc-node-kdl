const path = require('path');
const fs = require('fs');

const BASE_DOCUMENT_DIR = path.resolve(__dirname, '../document');

if (!fs.existsSync(BASE_DOCUMENT_DIR)) {
    fs.mkdirSync(BASE_DOCUMENT_DIR, { recursive: true });
}

const fileNameRegex = /^[a-zA-Z0-9_-]+\.xlsx$/;

function getSafeFilePath(fileName) {

    if (!fileNameRegex.test(fileName)) {
        throw new Error('Invalid file name format');
    }

    const resolvedPath = path.resolve(BASE_DOCUMENT_DIR, fileName);

    if (!resolvedPath.startsWith(BASE_DOCUMENT_DIR)) {
        throw new Error('Path traversal attempt detected');
    }

    return resolvedPath;
}

module.exports = {
    getSafeFilePath,
    BASE_DOCUMENT_DIR
};