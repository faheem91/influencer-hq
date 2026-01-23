const express = require('express');
const router = express.Router();
const imaiAgentService = require('../services/imaiAgentService');
const agentScheduler = require('../services/agentScheduler');

// Store for active SSE connections
const sseConnections = new Map(); // agentId -> Set of response objects

/**
 * Send SSE message to all connected clients for an agent
 */
function broadcastToAgent(agentId, data) {
  const connections = sseConnections.get(agentId);
  if (connections) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    connections.forEach((res) => {
      try {
        res.write(message);
      } catch (error) {
        console.error('Error writing to SSE connection:', error);
      }
    });
  }
}

// Forward IMAI agent logs to SSE connections
imaiAgentService.on('log', (logEntry) => {
  // Broadcast to all connections (in a real app, you'd track which agent is running)
  for (const [agentId] of sseConnections) {
    broadcastToAgent(agentId, {
      type: 'log',
      ...logEntry,
    });
  }
});

// Forward progress events for real-time counters
imaiAgentService.on('progress', (progressData) => {
  for (const [agentId] of sseConnections) {
    broadcastToAgent(agentId, {
      type: 'progress',
      ...progressData,
      timestamp: new Date().toISOString(),
    });
  }
});

// Forward stopping event
imaiAgentService.on('stopping', () => {
  for (const [agentId] of sseConnections) {
    broadcastToAgent(agentId, {
      type: 'status',
      status: 'stopping',
      timestamp: new Date().toISOString(),
      message: 'Agent is stopping...',
    });
  }
});

// Forward creators list updates
imaiAgentService.on('creators_update', (data) => {
  for (const [agentId] of sseConnections) {
    broadcastToAgent(agentId, {
      type: 'creators_update',
      creatorsList: data.creatorsList,
      currentCreatorIndex: data.currentCreatorIndex,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/agents/:id/stream
 * SSE endpoint for real-time agent logs
 */
router.get('/api/agents/:id/stream', (req, res) => {
  const agentId = req.params.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Initialize connection set for this agent if needed
  if (!sseConnections.has(agentId)) {
    sseConnections.set(agentId, new Set());
  }

  // Add this connection
  sseConnections.get(agentId).add(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', agentId, timestamp: new Date().toISOString() })}\n\n`);

  console.log(`[SSE] Client connected for agent ${agentId}`);

  // Handle client disconnect
  req.on('close', () => {
    const connections = sseConnections.get(agentId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseConnections.delete(agentId);
      }
    }
    console.log(`[SSE] Client disconnected for agent ${agentId}`);
  });
});

/**
 * POST /api/agents/:id/run
 * Trigger an immediate agent run
 */
router.post('/api/agents/:id/run', async (req, res) => {
  const agentId = req.params.id;
  const { client, imaiCredentials, creators, openRouterSettings } = req.body;

  if (!client || !imaiCredentials || !creators) {
    return res.status(400).json({
      error: 'Missing required data',
      required: ['client', 'imaiCredentials', 'creators'],
    });
  }

  // Configure OpenRouter if settings provided
  if (openRouterSettings?.apiKey) {
    imaiAgentService.setOpenRouterConfig(openRouterSettings.apiKey, openRouterSettings.model);
  }

  if (!client.imaiCampaignId) {
    return res.status(400).json({
      error: 'Client must have an IMAI Campaign ID configured',
    });
  }

  // Check if agent is already running
  const status = agentScheduler.getAgentStatus(agentId);
  if (status.isRunning) {
    return res.status(409).json({
      error: 'Agent is already running',
      status,
    });
  }

  // Broadcast that we're starting
  broadcastToAgent(agentId, {
    type: 'status',
    status: 'starting',
    timestamp: new Date().toISOString(),
    message: 'Agent run initiated',
  });

  try {
    // Run the agent
    const result = await agentScheduler.runAgentNow(agentId, async () => {
      return await imaiAgentService.runAgentForClient(client, imaiCredentials, creators);
    });

    // Broadcast completion
    broadcastToAgent(agentId, {
      type: 'status',
      status: 'completed',
      timestamp: new Date().toISOString(),
      result,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    // Broadcast error
    broadcastToAgent(agentId, {
      type: 'status',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/agents/:id/stop
 * Stop a running agent gracefully
 */
router.post('/api/agents/:id/stop', async (req, res) => {
  const agentId = req.params.id;

  try {
    // Stop the scheduler
    const schedulerStopped = agentScheduler.stopAgent(agentId);

    // Gracefully stop the IMAI agent (allows current operation to finish)
    await imaiAgentService.stop();

    // Broadcast stop initiated
    broadcastToAgent(agentId, {
      type: 'status',
      status: 'stopping',
      timestamp: new Date().toISOString(),
      message: 'Stop requested - finishing current operation...',
    });

    res.json({
      success: true,
      wasStopped: true,
      schedulerStopped,
      message: 'Agent will stop after current operation completes',
    });
  } catch (error) {
    // If graceful stop fails, force cleanup
    try {
      await imaiAgentService.cleanup();
    } catch (cleanupError) {
      console.error('Force cleanup also failed:', cleanupError);
    }

    broadcastToAgent(agentId, {
      type: 'status',
      status: 'stopped',
      timestamp: new Date().toISOString(),
      message: 'Agent force stopped due to error',
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/agents/:id/skip
 * Skip the currently processing creator
 */
router.post('/api/agents/:id/skip', (req, res) => {
  const agentId = req.params.id;

  if (!imaiAgentService.isRunning) {
    return res.status(400).json({
      success: false,
      error: 'Agent is not running',
    });
  }

  imaiAgentService.queueCommand({ type: 'skip' });

  broadcastToAgent(agentId, {
    type: 'log',
    level: 'warning',
    message: '⏭️ Skip command queued - will skip current creator',
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Skip command queued',
  });
});

/**
 * POST /api/agents/:id/relogin
 * Force re-login to IMAI
 */
router.post('/api/agents/:id/relogin', (req, res) => {
  const agentId = req.params.id;

  if (!imaiAgentService.isRunning) {
    return res.status(400).json({
      success: false,
      error: 'Agent is not running',
    });
  }

  imaiAgentService.queueCommand({ type: 'relogin' });

  broadcastToAgent(agentId, {
    type: 'log',
    level: 'info',
    message: '🔄 Relogin command queued - will re-authenticate',
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Relogin command queued',
  });
});

/**
 * POST /api/agents/:id/switch
 * Switch to a different creator in the queue
 */
router.post('/api/agents/:id/switch', (req, res) => {
  const agentId = req.params.id;
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      success: false,
      error: 'Missing username in request body',
    });
  }

  if (!imaiAgentService.isRunning) {
    return res.status(400).json({
      success: false,
      error: 'Agent is not running',
    });
  }

  imaiAgentService.queueCommand({ type: 'switch', username });

  broadcastToAgent(agentId, {
    type: 'log',
    level: 'info',
    message: `🔀 Switch command queued - will switch to @${username}`,
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Switch to @${username} command queued`,
  });
});

/**
 * GET /api/agents/:id/creators
 * Get the current creators list with statuses
 */
router.get('/api/agents/:id/creators', (req, res) => {
  const creatorsData = imaiAgentService.getCreatorsList();

  res.json({
    success: true,
    ...creatorsData,
  });
});

/**
 * GET /api/agents/:id/status
 * Get current agent status
 */
router.get('/api/agents/:id/status', (req, res) => {
  const agentId = req.params.id;

  const schedulerStatus = agentScheduler.getAgentStatus(agentId);
  const serviceStatus = imaiAgentService.getStatus();

  res.json({
    agentId,
    ...schedulerStatus,
    service: serviceStatus,
  });
});

/**
 * POST /api/agents/:id/schedule
 * Schedule an agent for recurring runs
 */
router.post('/api/agents/:id/schedule', (req, res) => {
  const agentId = req.params.id;
  const { intervalHours, client, imaiCredentials } = req.body;

  if (!intervalHours || !client || !imaiCredentials) {
    return res.status(400).json({
      error: 'Missing required data',
      required: ['intervalHours', 'client', 'imaiCredentials'],
    });
  }

  const result = agentScheduler.scheduleAgent(agentId, intervalHours, async () => {
    // This function will be called on schedule
    // In a real implementation, you'd fetch creators from the database
    const creators = []; // Fetch from database
    return await imaiAgentService.runAgentForClient(client, imaiCredentials, creators);
  });

  res.json({
    success: true,
    schedule: result,
  });
});

/**
 * DELETE /api/agents/:id/schedule
 * Cancel a scheduled agent
 */
router.delete('/api/agents/:id/schedule', (req, res) => {
  const agentId = req.params.id;
  const cancelled = agentScheduler.cancelAgent(agentId);

  res.json({
    success: cancelled,
    message: cancelled ? 'Schedule cancelled' : 'No schedule found',
  });
});

/**
 * GET /api/agents/scheduled
 * List all scheduled agents
 */
router.get('/api/agents/scheduled', (req, res) => {
  const agents = agentScheduler.getAllScheduledAgents();
  res.json(agents);
});

/**
 * POST /api/agents/test-login
 * Test IMAI login credentials
 */
router.post('/api/agents/test-login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing required data',
      required: ['email', 'password'],
    });
  }

  try {
    await imaiAgentService.login(email, password);
    await imaiAgentService.cleanup();

    res.json({
      success: true,
      message: 'Login successful',
    });
  } catch (error) {
    await imaiAgentService.cleanup();

    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
