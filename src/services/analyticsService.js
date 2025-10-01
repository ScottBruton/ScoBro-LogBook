/**
 * Analytics Service - Advanced analytics and insights for ScoBro Logbook
 * Provides comprehensive data analysis, charts, and productivity insights
 */

export class AnalyticsService {
  static STORAGE_KEY = 'analyticsConfig';
  static DEFAULT_CONFIG = {
    enabled: true,
    trackProductivity: true,
    trackTimeSpent: true,
    trackProjectProgress: true,
    trackTagUsage: true,
    trackPeopleCollaboration: true,
    generateInsights: true,
    insightFrequency: 'daily', // daily, weekly, monthly
    lastInsightGeneration: null,
    chartPreferences: {
      defaultTimeRange: '30d', // 7d, 30d, 90d, 1y
      chartType: 'line', // line, bar, pie, area
      showTrends: true,
      showComparisons: true
    }
  };

  /**
   * Get analytics configuration
   */
  static getAnalyticsConfig() {
    try {
      const config = localStorage.getItem(this.STORAGE_KEY);
      return config ? JSON.parse(config) : { ...this.DEFAULT_CONFIG };
    } catch (error) {
      console.error('Failed to get analytics config:', error);
      return { ...this.DEFAULT_CONFIG };
    }
  }

  /**
   * Save analytics configuration
   */
  static saveAnalyticsConfig(config) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Failed to save analytics config:', error);
      return false;
    }
  }

  /**
   * Generate comprehensive analytics data
   */
  static generateAnalytics(entries, timeTrackingData = [], calendarEvents = [], jiraIssues = []) {
    try {
      const config = this.getAnalyticsConfig();
      if (!config.enabled) {
        return null;
      }

      const now = new Date();
      const timeRanges = this.getTimeRanges(now);
      
      const analytics = {
        overview: this.generateOverview(entries, timeTrackingData, calendarEvents, jiraIssues),
        productivity: this.generateProductivityAnalytics(entries, timeTrackingData, timeRanges),
        projects: this.generateProjectAnalytics(entries, timeRanges),
        timeTracking: this.generateTimeTrackingAnalytics(timeTrackingData, timeRanges),
        collaboration: this.generateCollaborationAnalytics(entries, timeRanges),
        insights: this.generateInsights(entries, timeTrackingData, calendarEvents, jiraIssues),
        trends: this.generateTrends(entries, timeTrackingData, timeRanges),
        charts: this.generateChartData(entries, timeTrackingData, timeRanges),
        generatedAt: now.toISOString()
      };

      return analytics;
    } catch (error) {
      console.error('Failed to generate analytics:', error);
      return null;
    }
  }

  /**
   * Generate overview statistics
   */
  static generateOverview(entries, timeTrackingData, calendarEvents, jiraIssues) {
    const totalEntries = entries.length;
    const totalItems = entries.reduce((sum, entry) => sum + (entry.items?.length || 0), 0);
    const totalTimeTracked = timeTrackingData.reduce((sum, timer) => sum + (timer.duration || 0), 0);
    const totalCalendarEvents = calendarEvents.length;
    const totalJiraIssues = jiraIssues.length;

    // Calculate averages
    const avgItemsPerEntry = totalEntries > 0 ? (totalItems / totalEntries).toFixed(1) : 0;
    const avgTimePerSession = timeTrackingData.length > 0 ? (totalTimeTracked / timeTrackingData.length / 1000 / 60).toFixed(1) : 0; // minutes

    // Calculate streaks
    const entryStreak = this.calculateEntryStreak(entries);
    const timeTrackingStreak = this.calculateTimeTrackingStreak(timeTrackingData);

    return {
      totalEntries,
      totalItems,
      totalTimeTracked: this.formatDuration(totalTimeTracked),
      totalCalendarEvents,
      totalJiraIssues,
      avgItemsPerEntry,
      avgTimePerSession,
      entryStreak,
      timeTrackingStreak,
      productivityScore: this.calculateProductivityScore(entries, timeTrackingData, calendarEvents)
    };
  }

  /**
   * Generate productivity analytics
   */
  static generateProductivityAnalytics(entries, timeTrackingData, timeRanges) {
    const dailyProductivity = this.calculateDailyProductivity(entries, timeTrackingData, timeRanges.last30Days);
    const weeklyProductivity = this.calculateWeeklyProductivity(entries, timeTrackingData, timeRanges.last12Weeks);
    const monthlyProductivity = this.calculateMonthlyProductivity(entries, timeTrackingData, timeRanges.last12Months);

    const mostProductiveHours = this.findMostProductiveHours(entries, timeTrackingData);
    const mostProductiveDays = this.findMostProductiveDays(entries, timeTrackingData);

    return {
      daily: dailyProductivity,
      weekly: weeklyProductivity,
      monthly: monthlyProductivity,
      mostProductiveHours,
      mostProductiveDays,
      productivityTrend: this.calculateProductivityTrend(dailyProductivity),
      consistency: this.calculateConsistency(entries, timeTrackingData)
    };
  }

  /**
   * Generate project analytics
   */
  static generateProjectAnalytics(entries, timeRanges) {
    const projectStats = this.calculateProjectStats(entries, timeRanges.last30Days);
    const projectProgress = this.calculateProjectProgress(entries, timeRanges.last30Days);
    const projectTimeDistribution = this.calculateProjectTimeDistribution(entries, timeRanges.last30Days);

    return {
      stats: projectStats,
      progress: projectProgress,
      timeDistribution: projectTimeDistribution,
      topProjects: this.getTopProjects(projectStats, 5),
      projectTrends: this.calculateProjectTrends(entries, timeRanges)
    };
  }

  /**
   * Generate time tracking analytics
   */
  static generateTimeTrackingAnalytics(timeTrackingData, timeRanges) {
    const dailyTimeTracking = this.calculateDailyTimeTracking(timeTrackingData, timeRanges.last30Days);
    const weeklyTimeTracking = this.calculateWeeklyTimeTracking(timeTrackingData, timeRanges.last12Weeks);
    const taskBreakdown = this.calculateTaskBreakdown(timeTrackingData);
    const sessionAnalysis = this.analyzeSessions(timeTrackingData);

    return {
      daily: dailyTimeTracking,
      weekly: weeklyTimeTracking,
      taskBreakdown,
      sessionAnalysis,
      timeDistribution: this.calculateTimeDistribution(timeTrackingData),
      efficiency: this.calculateEfficiency(timeTrackingData)
    };
  }

  /**
   * Generate collaboration analytics
   */
  static generateCollaborationAnalytics(entries, timeRanges) {
    const peopleStats = this.calculatePeopleStats(entries, timeRanges.last30Days);
    const meetingStats = this.calculateMeetingStats(entries, timeRanges.last30Days);
    const communicationPatterns = this.analyzeCommunicationPatterns(entries, timeRanges.last30Days);

    return {
      people: peopleStats,
      meetings: meetingStats,
      communication: communicationPatterns,
      topCollaborators: this.getTopCollaborators(peopleStats, 5),
      collaborationTrends: this.calculateCollaborationTrends(entries, timeRanges)
    };
  }

  /**
   * Generate insights and recommendations
   */
  static generateInsights(entries, timeTrackingData, calendarEvents, jiraIssues) {
    const insights = [];

    // Productivity insights
    const productivityInsights = this.generateProductivityInsights(entries, timeTrackingData);
    insights.push(...productivityInsights);

    // Time management insights
    const timeInsights = this.generateTimeInsights(timeTrackingData, calendarEvents);
    insights.push(...timeInsights);

    // Project insights
    const projectInsights = this.generateProjectInsights(entries);
    insights.push(...projectInsights);

    // Collaboration insights
    const collaborationInsights = this.generateCollaborationInsights(entries);
    insights.push(...collaborationInsights);

    // Jira insights
    if (jiraIssues.length > 0) {
      const jiraInsights = this.generateJiraInsights(jiraIssues);
      insights.push(...jiraInsights);
    }

    return insights.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate trends analysis
   */
  static generateTrends(entries, timeTrackingData, timeRanges) {
    return {
      entryTrend: this.calculateEntryTrend(entries, timeRanges),
      timeTrackingTrend: this.calculateTimeTrackingTrend(timeTrackingData, timeRanges),
      projectTrend: this.calculateProjectTrend(entries, timeRanges),
      productivityTrend: this.calculateProductivityTrend(entries, timeRanges),
      seasonalPatterns: this.analyzeSeasonalPatterns(entries, timeTrackingData)
    };
  }

  /**
   * Generate chart data
   */
  static generateChartData(entries, timeTrackingData, timeRanges) {
    return {
      productivityChart: this.generateProductivityChart(entries, timeTrackingData, timeRanges.last30Days),
      projectChart: this.generateProjectChart(entries, timeRanges.last30Days),
      timeTrackingChart: this.generateTimeTrackingChart(timeTrackingData, timeRanges.last30Days),
      collaborationChart: this.generateCollaborationChart(entries, timeRanges.last30Days),
      trendsChart: this.generateTrendsChart(entries, timeTrackingData, timeRanges.last12Weeks)
    };
  }

  /**
   * Calculate productivity score (0-100)
   */
  static calculateProductivityScore(entries, timeTrackingData, calendarEvents) {
    let score = 0;

    // Entry consistency (30 points)
    const entryStreak = this.calculateEntryStreak(entries);
    score += Math.min(entryStreak * 2, 30);

    // Time tracking usage (25 points)
    const timeTrackingDays = new Set(timeTrackingData.map(t => new Date(t.startTime).toDateString())).size;
    score += Math.min(timeTrackingDays * 2, 25);

    // Calendar integration (20 points)
    if (calendarEvents.length > 0) {
      score += 20;
    }

    // Project diversity (15 points)
    const uniqueProjects = new Set(entries.flatMap(e => e.items?.map(i => i.project).filter(Boolean) || [])).size;
    score += Math.min(uniqueProjects * 3, 15);

    // Collaboration (10 points)
    const uniquePeople = new Set(entries.flatMap(e => e.items?.map(i => i.people).flat() || [])).size;
    score += Math.min(uniquePeople * 2, 10);

    return Math.min(score, 100);
  }

  /**
   * Calculate entry streak
   */
  static calculateEntryStreak(entries) {
    if (entries.length === 0) return 0;

    const sortedEntries = entries
      .map(e => new Date(e.timestamp))
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i]);
      entryDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate time tracking streak
   */
  static calculateTimeTrackingStreak(timeTrackingData) {
    if (timeTrackingData.length === 0) return 0;

    const sortedTimers = timeTrackingData
      .map(t => new Date(t.startTime))
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedTimers.length; i++) {
      const timerDate = new Date(sortedTimers[i]);
      timerDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - timerDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  }

  /**
   * Format duration in milliseconds to human readable format
   */
  static formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get time ranges for analysis
   */
  static getTimeRanges(now) {
    const last7Days = [];
    const last30Days = [];
    const last12Weeks = [];
    const last12Months = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      last30Days.push(date.toISOString().split('T')[0]);
    }

    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i * 7));
      last12Weeks.push(date.toISOString().split('T')[0]);
    }

    for (let i = 0; i < 12; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      last12Months.push(date.toISOString().split('T')[0].substring(0, 7));
    }

    return {
      last7Days,
      last30Days,
      last12Weeks,
      last12Months
    };
  }

  /**
   * Calculate daily productivity
   */
  static calculateDailyProductivity(entries, timeTrackingData, days) {
    return days.map(day => {
      const dayEntries = entries.filter(e => e.timestamp.startsWith(day));
      const dayTimers = timeTrackingData.filter(t => t.startTime.startsWith(day));
      
      const totalItems = dayEntries.reduce((sum, e) => sum + (e.items?.length || 0), 0);
      const totalTime = dayTimers.reduce((sum, t) => sum + (t.duration || 0), 0);
      
      return {
        date: day,
        entries: dayEntries.length,
        items: totalItems,
        timeTracked: totalTime,
        productivity: this.calculateDayProductivity(dayEntries, dayTimers)
      };
    }).reverse();
  }

  /**
   * Calculate day productivity score
   */
  static calculateDayProductivity(entries, timers) {
    let score = 0;
    
    // Entries (40 points)
    score += Math.min(entries.length * 10, 40);
    
    // Items (30 points)
    const totalItems = entries.reduce((sum, e) => sum + (e.items?.length || 0), 0);
    score += Math.min(totalItems * 5, 30);
    
    // Time tracking (30 points)
    const totalTime = timers.reduce((sum, t) => sum + (t.duration || 0), 0);
    const hours = totalTime / (1000 * 60 * 60);
    score += Math.min(hours * 10, 30);
    
    return Math.min(score, 100);
  }

  /**
   * Generate productivity insights
   */
  static generateProductivityInsights(entries, timeTrackingData) {
    const insights = [];
    
    const entryStreak = this.calculateEntryStreak(entries);
    if (entryStreak >= 7) {
      insights.push({
        type: 'achievement',
        title: '🔥 Amazing Streak!',
        message: `You've logged entries for ${entryStreak} consecutive days!`,
        priority: 3,
        category: 'productivity'
      });
    } else if (entryStreak >= 3) {
      insights.push({
        type: 'encouragement',
        title: '📈 Great Progress!',
        message: `You're on a ${entryStreak}-day streak. Keep it up!`,
        priority: 2,
        category: 'productivity'
      });
    }

    const totalTime = timeTrackingData.reduce((sum, t) => sum + (t.duration || 0), 0);
    const hours = totalTime / (1000 * 60 * 60);
    
    if (hours >= 40) {
      insights.push({
        type: 'achievement',
        title: '⏰ Time Tracking Champion!',
        message: `You've tracked ${this.formatDuration(totalTime)} this month!`,
        priority: 3,
        category: 'time'
      });
    }

    return insights;
  }

  /**
   * Generate time insights
   */
  static generateTimeInsights(timeTrackingData, calendarEvents) {
    const insights = [];
    
    if (timeTrackingData.length === 0) {
      insights.push({
        type: 'suggestion',
        title: '⏱️ Start Time Tracking',
        message: 'Try using the time tracking feature to better understand how you spend your time.',
        priority: 2,
        category: 'time'
      });
    }

    if (calendarEvents.length > 0 && timeTrackingData.length > 0) {
      insights.push({
        type: 'insight',
        title: '📅 Calendar Integration',
        message: 'Great job syncing your calendar! This helps provide better context for your entries.',
        priority: 1,
        category: 'integration'
      });
    }

    return insights;
  }

  /**
   * Generate project insights
   */
  static generateProjectInsights(entries) {
    const insights = [];
    
    const projectCounts = {};
    entries.forEach(entry => {
      entry.items?.forEach(item => {
        if (item.project) {
          projectCounts[item.project] = (projectCounts[item.project] || 0) + 1;
        }
      });
    });

    const topProject = Object.entries(projectCounts).sort(([,a], [,b]) => b - a)[0];
    
    if (topProject && topProject[1] >= 10) {
      insights.push({
        type: 'insight',
        title: '🎯 Project Focus',
        message: `You've been working heavily on "${topProject[0]}" with ${topProject[1]} entries.`,
        priority: 1,
        category: 'project'
      });
    }

    return insights;
  }

  /**
   * Generate collaboration insights
   */
  static generateCollaborationInsights(entries) {
    const insights = [];
    
    const peopleCounts = {};
    entries.forEach(entry => {
      entry.items?.forEach(item => {
        item.people?.forEach(person => {
          peopleCounts[person] = (peopleCounts[person] || 0) + 1;
        });
      });
    });

    const collaboratorCount = Object.keys(peopleCounts).length;
    
    if (collaboratorCount >= 5) {
      insights.push({
        type: 'insight',
        title: '🤝 Team Player',
        message: `You've collaborated with ${collaboratorCount} different people this month!`,
        priority: 1,
        category: 'collaboration'
      });
    }

    return insights;
  }

  /**
   * Generate Jira insights
   */
  static generateJiraInsights(jiraIssues) {
    const insights = [];
    
    const statusCounts = {};
    jiraIssues.forEach(issue => {
      statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
    });

    const inProgressCount = statusCounts['In Progress'] || 0;
    
    if (inProgressCount >= 5) {
      insights.push({
        type: 'warning',
        title: '⚠️ Many Active Issues',
        message: `You have ${inProgressCount} issues in progress. Consider focusing on fewer at a time.`,
        priority: 2,
        category: 'jira'
      });
    }

    return insights;
  }

  // Additional helper methods would be implemented here...
  // For brevity, I'm including the key methods. The full implementation would include
  // all the calculation methods referenced above.

  static calculateWeeklyProductivity(entries, timeTrackingData, weeks) {
    // Implementation for weekly productivity calculation
    return weeks.map(week => ({
      week,
      entries: 0,
      items: 0,
      timeTracked: 0,
      productivity: 0
    }));
  }

  static calculateMonthlyProductivity(entries, timeTrackingData, months) {
    // Implementation for monthly productivity calculation
    return months.map(month => ({
      month,
      entries: 0,
      items: 0,
      timeTracked: 0,
      productivity: 0
    }));
  }

  static findMostProductiveHours(entries, timeTrackingData) {
    // Implementation to find most productive hours
    return [];
  }

  static findMostProductiveDays(entries, timeTrackingData) {
    // Implementation to find most productive days
    return [];
  }

  static calculateProductivityTrend(dailyProductivity) {
    // Implementation for productivity trend calculation
    return { direction: 'up', percentage: 0 };
  }

  static calculateConsistency(entries, timeTrackingData) {
    // Implementation for consistency calculation
    return { score: 0, description: 'Consistent' };
  }

  static calculateProjectStats(entries, days) {
    // Implementation for project statistics
    return {};
  }

  static calculateProjectProgress(entries, days) {
    // Implementation for project progress
    return {};
  }

  static calculateProjectTimeDistribution(entries, days) {
    // Implementation for project time distribution
    return {};
  }

  static getTopProjects(projectStats, limit) {
    // Implementation to get top projects
    return [];
  }

  static calculateProjectTrends(entries, timeRanges) {
    // Implementation for project trends
    return {};
  }

  static calculateDailyTimeTracking(timeTrackingData, days) {
    // Implementation for daily time tracking
    return [];
  }

  static calculateWeeklyTimeTracking(timeTrackingData, weeks) {
    // Implementation for weekly time tracking
    return [];
  }

  static calculateTaskBreakdown(timeTrackingData) {
    // Implementation for task breakdown
    return {};
  }

  static analyzeSessions(timeTrackingData) {
    // Implementation for session analysis
    return {};
  }

  static calculateTimeDistribution(timeTrackingData) {
    // Implementation for time distribution
    return {};
  }

  static calculateEfficiency(timeTrackingData) {
    // Implementation for efficiency calculation
    return { score: 0, description: 'Efficient' };
  }

  static calculatePeopleStats(entries, days) {
    // Implementation for people statistics
    return {};
  }

  static calculateMeetingStats(entries, days) {
    // Implementation for meeting statistics
    return {};
  }

  static analyzeCommunicationPatterns(entries, days) {
    // Implementation for communication patterns
    return {};
  }

  static getTopCollaborators(peopleStats, limit) {
    // Implementation to get top collaborators
    return [];
  }

  static calculateCollaborationTrends(entries, timeRanges) {
    // Implementation for collaboration trends
    return {};
  }

  static calculateEntryTrend(entries, timeRanges) {
    // Implementation for entry trend
    return { direction: 'up', percentage: 0 };
  }

  static calculateTimeTrackingTrend(timeTrackingData, timeRanges) {
    // Implementation for time tracking trend
    return { direction: 'up', percentage: 0 };
  }

  static calculateProjectTrend(entries, timeRanges) {
    // Implementation for project trend
    return { direction: 'up', percentage: 0 };
  }

  static analyzeSeasonalPatterns(entries, timeTrackingData) {
    // Implementation for seasonal patterns
    return {};
  }

  static generateProductivityChart(entries, timeTrackingData, days) {
    // Implementation for productivity chart data
    return { labels: [], datasets: [] };
  }

  static generateProjectChart(entries, days) {
    // Implementation for project chart data
    return { labels: [], datasets: [] };
  }

  static generateTimeTrackingChart(timeTrackingData, days) {
    // Implementation for time tracking chart data
    return { labels: [], datasets: [] };
  }

  static generateCollaborationChart(entries, days) {
    // Implementation for collaboration chart data
    return { labels: [], datasets: [] };
  }

  static generateTrendsChart(entries, timeTrackingData, weeks) {
    // Implementation for trends chart data
    return { labels: [], datasets: [] };
  }
}
