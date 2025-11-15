const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

//Enable CORS for local development
app.use(cors({
    origin: 'http://localhost:8000',
    credentials: true
}));

//Serve static files from public directory
app.use(express.static('public'));

//Serve index.html for all routes (SPA behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('Transcribe Frontend Server Running');
    console.log('========================================');
    console.log(`\nFrontend: http://localhost:${PORT}`);
    console.log('Backend Auth API: http://localhost:8000');
    console.log('\nMake sure the backend auth service is running!');
    console.log('Run: cd ../transcribe-auth && docker-compose up -d');
    console.log('\nPress Ctrl+C to stop the server');
    console.log('========================================\n');
});
