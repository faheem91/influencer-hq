const schedule = require('node-schedule');
const EventEmitter = require('events');

class AgentScheduler extends EventEmitter {
  constructor() {
    super();
    this.scheduledJobs = new Map(); // agentId -> job
    this.runningAgents = new Map(); // agentId -> status
  }

  /**
   * Schedule an agent to run at regular intervals
   */
  scheduleAgent(agentId, intervalHours, runFunction) {
    // Cancel existing job if any
    this.cancelAgent(agentId);

    // Calculate cron expression for interval (e.g., every 12 hours)
    // For simplicity, run at specific hours
    const rule = new schedule.RecurrenceRule();
    rule.hour = intervalHours === 12 ? [0, 12] : [0]; // Every 12 hours or once daily

    const job = schedule.scheduleJob(rule, async () => {
      console.log(`[SCHEDULER] Running scheduled job for agent ${agentId}`);
      this.emit('agentStart', { agentId, scheduled: true });

      try {
        await runFunction(agentId);
        this.emit('agentComplete', { agentId, success: true });
      } catch (error) {
        console.error(`[SCHEDULER] Agent ${agentId} failed:`, error.message);
        this.emit('agentComplete', { agentId, success: false, error: error.message });
      }
    });

    this.scheduledJobs.set(agentId, job);

    // Calculate next run time
    const nextRun = job.nextInvocation();

    console.log(`[SCHEDULER] Agent ${agentId} scheduled. Next run: ${nextRun}`);

    return {
      agentId,
      intervalHours,
      nextRun: nextRun ? nextRun.toISOString() : null,
    };
  }

  /**
   * Cancel a scheduled agent
   */
  cancelAgent(agentId) {
    const job = this.scheduledJobs.get(agentId);
    if (job) {
      job.cancel();
      this.scheduledJobs.delete(agentId);
      console.log(`[SCHEDULER] Agent ${agentId} cancelled`);
      return true;
    }
    return false;
  }

  /**
   * Run an agent immediately (outside of schedule)
   */
  async runAgentNow(agentId, runFunction) {
    if (this.runningAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} is already running`);
    }

    this.runningAgents.set(agentId, {
      startTime: new Date(),
      status: 'running',
    });

    this.emit('agentStart', { agentId, scheduled: false });

    try {
      const result = await runFunction(agentId);
      this.runningAgents.delete(agentId);
      this.emit('agentComplete', { agentId, success: true, result });
      return result;
    } catch (error) {
      this.runningAgents.delete(agentId);
      this.emit('agentComplete', { agentId, success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Stop a running agent
   */
  stopAgent(agentId) {
    const status = this.runningAgents.get(agentId);
    if (status) {
      this.runningAgents.delete(agentId);
      this.emit('agentStop', { agentId });
      console.log(`[SCHEDULER] Agent ${agentId} stopped`);
      return true;
    }
    return false;
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentId) {
    const job = this.scheduledJobs.get(agentId);
    const running = this.runningAgents.get(agentId);

    return {
      agentId,
      isScheduled: !!job,
      isRunning: !!running,
      nextRun: job?.nextInvocation()?.toISOString() || null,
      runningStatus: running || null,
    };
  }

  /**
   * Get all scheduled agents
   */
  getAllScheduledAgents() {
    const agents = [];
    for (const [agentId, job] of this.scheduledJobs) {
      agents.push({
        agentId,
        nextRun: job.nextInvocation()?.toISOString() || null,
        isRunning: this.runningAgents.has(agentId),
      });
    }
    return agents;
  }
}

// Export a singleton instance
module.exports = new AgentScheduler();
