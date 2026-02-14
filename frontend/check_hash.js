const bcrypt = require('bcryptjs');

// Security: Remove hardcoded credentials. Pass as command line argument: node check_hash.js "<password>" "<hash>"
const password = process.argv[2];
const hashFromFile = process.argv[3];

if (!password || !hashFromFile) {
    console.log('Usage: node check_hash.js "<password>" "<hash>"');
    process.exit(1);
}

console.log(`Checking password for: ${password}`);

// Compare
bcrypt.compare(password, hashFromFile).then((res) => {
    console.log(`Matching against hash: ${res}`);

    // Generate new hash just in case
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(password, salt);
    console.log(`New hash: ${newHash}`);
});
