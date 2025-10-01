/**
 * TimeTrackingService - Time tracking with start/stop timers
 * 
 * This service provides:
 * - Start/stop timers for tasks and projects
 * - Automatic time logging
 * - Time tracking analytics
 * - Integration with entries and projects
 */

export class TimeTrackingService {
  static STORAGE_KEY = 'timeTrackingData';
  static ACTIVE_TIMER_KEY = 'activeTimer';

  /**
   * Start a timer for a specific task/project
   */
  static startTimer(taskName, project = null, description = null) {
    const timer = {
      id: this.generateId(),
      taskName,
      project,
      description,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      status: 'active'
    };

    // Store active timer
    localStorage.setItem(this.ACTIVE_TIMER_KEY, JSON.stringify(timer));
    
    // Add to time tracking data
    const timeData = this.getTimeTrackingData();
    timeData.timers.push(timer);
    this.saveTimeTrackingData(timeData);

    return timer;
  }

  /**
   * Stop the currently active timer
   */
  static stopTimer() {
    const activeTimer = this.getActiveTimer();
    if (!activeTimer) {
      throw new Error('No active timer to stop');
    }

    const endTime = new Date();
    const startTime = new Date(activeTimer.startTime);
    const duration = endTime.getTime() - startTime.getTime();

    // Update timer
    activeTimer.endTime = endTime.toISOString();
    activeTimer.duration = duration;
    activeTimer.status = 'completed';

    // Update in storage
    const timeData = this.getTimeTrackingData();
    const timerIndex = timeData.timers.findIndex(t => t.id === activeTimer.id);
    if (timerIndex !== -1) {
      timeData.timers[timerIndex] = activeTimer;
    }
    this.saveTimeTrackingData(timeData);

    // Clear active timer
    localStorage.removeItem(this.ACTIVE_TIMER_KEY);

    return activeTimer;
  }

  /**
   * Get the currently active timer
   */
  static getActiveTimer() {
    const activeTimerData = localStorage.getItem(this.ACTIVE_TIMER_KEY);
    if (!activeTimerData) return null;

    try {
      return JSON.parse(activeTimerData);
    } catch (error) {
      console.error('Failed to parse active timer:', error);
      return null;
    }
  }

  /**
   * Check if there's an active timer
   */
  static isTimerActive() {
    return this.getActiveTimer() !== null;
  }

  /**
   * Get current timer duration (for active timers)
   */
  static getCurrentTimerDuration() {
    const activeTimer = this.getActiveTimer();
    if (!activeTimer) return 0;

    const startTime = new Date(activeTimer.startTime);
    const currentTime = new Date();
    return currentTime.getTime() - startTime.getTime();
  }

  /**
   * Format duration in milliseconds to human readable format
   */
  static formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get time tracking data
   */
  static getTimeTrackingData() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      return {
        timers: [],
        totalTime: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse time tracking data:', error);
      return {
        timers: [],
        totalTime: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Save time tracking data
   */
  static saveTimeTrackingData(data) {
    data.lastUpdated = new Date().toISOString();
    data.totalTime = this.calculateTotalTime(data.timers);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Calculate total time from all completed timers
   */
  static calculateTotalTime(timers) {
    return timers
      .filter(timer => timer.status === 'completed' && timer.duration)
      .reduce((total, timer) => total + timer.duration, 0);
  }

  /**
   * Get time tracking statistics
   */
  static getTimeTrackingStats() {
    const data = this.getTimeTrackingData();
    const timers = data.timers;

    const stats = {
      totalTime: data.totalTime,
      totalSessions: timers.filter(t => t.status === 'completed').length,
      averageSessionDuration: 0,
      mostActiveProject: null,
      mostActiveTask: null,
      todayTime: 0,
      thisWeekTime: 0,
      thisMonthTime: 0
    };

    if (stats.totalSessions > 0) {
      stats.averageSessionDuration = stats.totalTime / stats.totalSessions;
    }

    // Calculate time by period
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const completedTimers = timers.filter(t => t.status === 'completed' && t.duration);

    stats.todayTime = completedTimers
      .filter(t => new Date(t.endTime) >= today)
      .reduce((total, t) => total + t.duration, 0);

    stats.thisWeekTime = completedTimers
      .filter(t => new Date(t.endTime) >= weekStart)
      .reduce((total, t) => total + t.duration, 0);

    stats.thisMonthTime = completedTimers
      .filter(t => new Date(t.endTime) >= monthStart)
      .reduce((total, t) => total + t.duration, 0);

    // Find most active project and task
    const projectTimes = {};
    const taskTimes = {};

    completedTimers.forEach(timer => {
      if (timer.project) {
        projectTimes[timer.project] = (projectTimes[timer.project] || 0) + timer.duration;
      }
      taskTimes[timer.taskName] = (taskTimes[timer.taskName] || 0) + timer.duration;
    });

    stats.mostActiveProject = Object.entries(projectTimes)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    stats.mostActiveTask = Object.entries(taskTimes)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    return stats;
  }

  /**
   * Get time tracking data for a specific date range
   */
  static getTimeTrackingByDateRange(startDate, endDate) {
    const data = this.getTimeTrackingData();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return data.timers.filter(timer => {
      const timerDate = new Date(timer.startTime);
      return timerDate >= start && timerDate <= end;
    });
  }

  /**
   * Get time tracking data grouped by project
   */
  static getTimeTrackingByProject() {
    const data = this.getTimeTrackingData();
    const projectTimes = {};

    data.timers
      .filter(timer => timer.status === 'completed' && timer.duration)
      .forEach(timer => {
        const project = timer.project || 'No Project';
        if (!projectTimes[project]) {
          projectTimes[project] = {
            totalTime: 0,
            sessions: 0,
            tasks: new Set()
          };
        }
        projectTimes[project].totalTime += timer.duration;
        projectTimes[project].sessions += 1;
        projectTimes[project].tasks.add(timer.taskName);
      });

    // Convert Set to Array for serialization
    Object.keys(projectTimes).forEach(project => {
      projectTimes[project].tasks = Array.from(projectTimes[project].tasks);
    });

    return projectTimes;
  }

  /**
   * Get time tracking data grouped by task
   */
  static getTimeTrackingByTask() {
    const data = this.getTimeTrackingData();
    const taskTimes = {};

    data.timers
      .filter(timer => timer.status === 'completed' && timer.duration)
      .forEach(timer => {
        const task = timer.taskName;
        if (!taskTimes[task]) {
          taskTimes[task] = {
            totalTime: 0,
            sessions: 0,
            projects: new Set()
          };
        }
        taskTimes[task].totalTime += timer.duration;
        taskTimes[task].sessions += 1;
        if (timer.project) {
          taskTimes[task].projects.add(timer.project);
        }
      });

    // Convert Set to Array for serialization
    Object.keys(taskTimes).forEach(task => {
      taskTimes[task].projects = Array.from(taskTimes[task].projects);
    });

    return taskTimes;
  }

  /**
   * Create an entry from a completed timer
   */
  static createEntryFromTimer(timer, entryType = 'Note') {
    if (timer.status !== 'completed') {
      throw new Error('Timer must be completed to create entry');
    }

    const duration = this.formatDuration(timer.duration);
    const content = `Time tracked: ${duration}\nTask: ${timer.taskName}${timer.description ? `\nDescription: ${timer.description}` : ''}`;

    return {
      item_type: entryType,
      content,
      project: timer.project,
      tags: ['time-tracking'],
      jira: [],
      people: []
    };
  }

  /**
   * Delete a timer
   */
  static deleteTimer(timerId) {
    const data = this.getTimeTrackingData();
    const timerIndex = data.timers.findIndex(t => t.id === timerId);
    
    if (timerIndex === -1) {
      throw new Error('Timer not found');
    }

    const timer = data.timers[timerIndex];
    
    // If it's the active timer, stop it first
    if (timer.status === 'active') {
      this.stopTimer();
    } else {
      data.timers.splice(timerIndex, 1);
      this.saveTimeTrackingData(data);
    }

    return timer;
  }

  /**
   * Update a timer
   */
  static updateTimer(timerId, updates) {
    const data = this.getTimeTrackingData();
    const timerIndex = data.timers.findIndex(t => t.id === timerId);
    
    if (timerIndex === -1) {
      throw new Error('Timer not found');
    }

    const timer = data.timers[timerIndex];
    const updatedTimer = { ...timer, ...updates };
    
    data.timers[timerIndex] = updatedTimer;
    this.saveTimeTrackingData(data);

    // If it's the active timer, update it in localStorage too
    if (timer.status === 'active') {
      localStorage.setItem(this.ACTIVE_TIMER_KEY, JSON.stringify(updatedTimer));
    }

    return updatedTimer;
  }

  /**
   * Generate a unique ID
   */
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Export time tracking data
   */
  static exportTimeTrackingData(format = 'json') {
    const data = this.getTimeTrackingData();
    
    if (format === 'csv') {
      return this.exportToCSV(data.timers);
    } else if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    throw new Error('Unsupported export format');
  }

  /**
   * Export timers to CSV format
   */
  static exportToCSV(timers) {
    const headers = ['ID', 'Task Name', 'Project', 'Description', 'Start Time', 'End Time', 'Duration (ms)', 'Duration (formatted)', 'Status'];
    const rows = timers.map(timer => [
      timer.id,
      timer.taskName,
      timer.project || '',
      timer.description || '',
      timer.startTime,
      timer.endTime || '',
      timer.duration || '',
      timer.duration ? this.formatDuration(timer.duration) : '',
      timer.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get productivity insights
   */
  static getProductivityInsights() {
    const stats = this.getTimeTrackingStats();
    const insights = [];

    // Time-based insights
    if (stats.todayTime > 0) {
      const todayHours = stats.todayTime / (1000 * 60 * 60);
      if (todayHours >= 8) {
        insights.push({
          type: 'achievement',
          message: `Great work! You've tracked ${todayHours.toFixed(1)} hours today.`,
          icon: '🎯'
        });
      } else if (todayHours >= 4) {
        insights.push({
          type: 'progress',
          message: `You've tracked ${todayHours.toFixed(1)} hours today. Keep it up!`,
          icon: '📈'
        });
      }
    }

    // Consistency insights
    if (stats.thisWeekTime > 0) {
      const weekHours = stats.thisWeekTime / (1000 * 60 * 60);
      const dailyAverage = weekHours / 7;
      
      if (dailyAverage >= 6) {
        insights.push({
          type: 'consistency',
          message: `You're averaging ${dailyAverage.toFixed(1)} hours per day this week. Excellent consistency!`,
          icon: '🔥'
        });
      }
    }

    // Project insights
    if (stats.mostActiveProject) {
      insights.push({
        type: 'project',
        message: `Your most active project is "${stats.mostActiveProject}".`,
        icon: '📂'
      });
    }

    // Task insights
    if (stats.mostActiveTask) {
      insights.push({
        type: 'task',
        message: `Your most tracked task is "${stats.mostActiveTask}".`,
        icon: '⚡'
      });
    }

    return insights;
  }
}

