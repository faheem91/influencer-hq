const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const config = require('./config/instagram');
const instagramRoutes = require('./routes/instagramRoutes');
const agentRoutes = require('./routes/agentRoutes');
const instagramService = require('./services/instagramService');

const app = express();

// CORS Configuration - Allow all origins for development
const corsOptions = {
    origin: true, // Allow all origins (for development)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', instagramRoutes);
app.use('/', agentRoutes);

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize Instagram login on server start
async function initializeInstagram() {
    try {
        console.log('\n🔄 Initializing Instagram connection...');
        await instagramService.login();
        console.log('✅ Instagram initialized and ready!\n');
    } catch (error) {
        console.error('❌ Instagram initialization failed:', error.message);
        console.error('⚠️  Server will continue running, but Instagram features may not work');
        console.error('💡 Tip: Check your credentials in .env file\n');
    }
}

// Start server
const PORT = config.server.port;
app.listen(PORT, async () => {
    console.log('\n================================================');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('================================================\n');
    
    console.log(`📝 API Endpoints:`);
    console.log(`   GET  /api/instagram/test - Test connection`);
    console.log(`   GET  /api/instagram/search?keyword={keyword} - Search posts`);
    console.log(`   GET  /api/instagram/account - Get account info`);
    console.log(`   POST /api/instagram/logout - Logout`);
    console.log(`\n📝 Agent Endpoints:`);
    console.log(`   GET  /api/agents/:id/stream - SSE real-time logs`);
    console.log(`   POST /api/agents/:id/run - Trigger immediate run`);
    console.log(`   POST /api/agents/:id/stop - Stop running agent`);
    console.log(`   GET  /api/agents/:id/status - Get agent status`);
    console.log(`   POST /api/agents/test-login - Test IMAI credentials\n`);
    
    // Initialize Instagram connection
    await initializeInstagram();
    
    console.log('================================================');
    console.log('✅ Server is ready to accept requests!');
    console.log('================================================\n');
});