/**
 * SmartPromptsService - AI-powered suggestions and time-based nudges
 * 
 * This service provides intelligent prompts based on:
 * - Time of day patterns
 * - User behavior analysis
 * - Entry content analysis
 * - Project and tag usage patterns
 * - Meeting schedules
 */

export class SmartPromptsService {
  static prompts = {
    morning: [
      "🌅 Good morning! What's your top priority for today?",
      "☀️ Ready to tackle the day? What's your first action item?",
      "🌞 Morning! Any important decisions you need to make today?",
      "☕ Coffee time! What meetings or calls do you have scheduled?",
      "🌅 Start your day right - what's your main focus today?"
    ],
    afternoon: [
      "🌤️ How's your day going? Any progress updates to log?",
      "📝 Afternoon check-in: What have you accomplished so far?",
      "🔄 Time for a mid-day review - any decisions made?",
      "💡 Any new ideas or insights from your morning work?",
      "📊 How are you tracking against your daily goals?"
    ],
    evening: [
      "🌙 Evening reflection time - what went well today?",
      "📋 End of day wrap-up: any final notes or decisions?",
      "🎯 What did you accomplish today?",
      "🤔 Any lessons learned or insights to capture?",
      "📝 Time to log your day - what were the key highlights?"
    ],
    weekly: [
      "📅 Weekly review time - how did this week go?",
      "📊 What were your biggest wins this week?",
      "🎯 What should you focus on next week?",
      "📈 Any patterns or trends you've noticed?",
      "🔄 What would you do differently next week?"
    ],
    project: [
      "📂 How's your [PROJECT] project progressing?",
      "🎯 Any updates on [PROJECT] you'd like to capture?",
      "📋 Time to check in on [PROJECT] - any blockers?",
      "💡 Any new ideas for [PROJECT]?",
      "📊 [PROJECT] status update needed?"
    ],
    meeting: [
      "📅 You have a meeting in 15 minutes - any prep notes?",
      "🤝 Meeting starting soon - what's the agenda?",
      "📝 Post-meeting: any action items to capture?",
      "💭 Meeting reflection - what were the key takeaways?",
      "🎯 Any decisions made in that meeting?"
    ]
  };

  static nudgeIntervals = {
    morning: { start: 8, end: 10 },
    afternoon: { start: 14, end: 16 },
    evening: { start: 17, end: 19 },
    weekly: { day: 5, hour: 17 } // Friday 5 PM
  };

  /**
   * Get a smart prompt based on current context
   */
  static async getSmartPrompt(context = {}) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Determine time-based context
    let timeContext = 'afternoon';
    if (hour >= this.nudgeIntervals.morning.start && hour <= this.nudgeIntervals.morning.end) {
      timeContext = 'morning';
    } else if (hour >= this.nudgeIntervals.evening.start && hour <= this.nudgeIntervals.evening.end) {
      timeContext = 'evening';
    }

    // Check for weekly nudge
    if (dayOfWeek === this.nudgeIntervals.weekly.day && hour >= this.nudgeIntervals.weekly.hour) {
      timeContext = 'weekly';
    }

    // Get base prompt
    const basePrompts = this.prompts[timeContext] || this.prompts.afternoon;
    let selectedPrompt = basePrompts[Math.floor(Math.random() * basePrompts.length)];

    // Enhance with context
    if (context.activeProject) {
      selectedPrompt = selectedPrompt.replace('[PROJECT]', context.activeProject);
    }

    if (context.upcomingMeeting) {
      selectedPrompt = this.prompts.meeting[Math.floor(Math.random() * this.prompts.meeting.length)];
    }

    return {
      prompt: selectedPrompt,
      context: timeContext,
      timestamp: now.toISOString(),
      priority: this.getPromptPriority(timeContext, context)
    };
  }

  /**
   * Get prompt priority based on context
   */
  static getPromptPriority(timeContext, context) {
    if (context.upcomingMeeting) return 'high';
    if (timeContext === 'weekly') return 'medium';
    if (timeContext === 'morning') return 'medium';
    return 'low';
  }

  /**
   * Analyze user patterns for personalized prompts
   */
  static async analyzeUserPatterns(entries) {
    const patterns = {
      mostActiveHours: this.getMostActiveHours(entries),
      favoriteProjects: this.getFavoriteProjects(entries),
      commonTags: this.getCommonTags(entries),
      entryFrequency: this.getEntryFrequency(entries),
      averageEntryLength: this.getAverageEntryLength(entries)
    };

    return patterns;
  }

  /**
   * Get most active hours from entries
   */
  static getMostActiveHours(entries) {
    const hourCounts = {};
    
    entries.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
  }

  /**
   * Get favorite projects from entries
   */
  static getFavoriteProjects(entries) {
    const projectCounts = {};
    
    entries.forEach(entry => {
      entry.items.forEach(item => {
        if (item.project) {
          projectCounts[item.project] = (projectCounts[item.project] || 0) + 1;
        }
      });
    });

    return Object.entries(projectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([project]) => project);
  }

  /**
   * Get common tags from entries
   */
  static getCommonTags(entries) {
    const tagCounts = {};
    
    entries.forEach(entry => {
      entry.items.forEach(item => {
        item.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
    });

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  /**
   * Get entry frequency patterns
   */
  static getEntryFrequency(entries) {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentEntries = entries.filter(entry => 
      new Date(entry.timestamp) >= lastWeek
    );

    const monthlyEntries = entries.filter(entry => 
      new Date(entry.timestamp) >= lastMonth
    );

    return {
      daily: recentEntries.length / 7,
      weekly: recentEntries.length,
      monthly: monthlyEntries.length
    };
  }

  /**
   * Get average entry length
   */
  static getAverageEntryLength(entries) {
    if (entries.length === 0) return 0;
    
    const totalLength = entries.reduce((sum, entry) => {
      return sum + entry.items.reduce((itemSum, item) => {
        return itemSum + item.content.length;
      }, 0);
    }, 0);

    return totalLength / entries.length;
  }

  /**
   * Generate contextual suggestions based on patterns
   */
  static async generateContextualSuggestions(patterns, currentContext = {}) {
    const suggestions = [];

    // Time-based suggestions
    const currentHour = new Date().getHours();
    if (patterns.mostActiveHours.includes(currentHour)) {
      suggestions.push({
        type: 'timing',
        message: "You're usually most productive at this time!",
        priority: 'medium'
      });
    }

    // Project suggestions
    if (currentContext.activeProject && patterns.favoriteProjects.includes(currentContext.activeProject)) {
      suggestions.push({
        type: 'project',
        message: `You work on ${currentContext.activeProject} frequently - any updates?`,
        priority: 'medium'
      });
    }

    // Tag suggestions
    if (patterns.commonTags.length > 0) {
      const randomTag = patterns.commonTags[Math.floor(Math.random() * Math.min(3, patterns.commonTags.length))];
      suggestions.push({
        type: 'tag',
        message: `Consider adding the "${randomTag}" tag to your entry`,
        priority: 'low'
      });
    }

    // Frequency suggestions
    if (patterns.entryFrequency.daily < 1) {
      suggestions.push({
        type: 'frequency',
        message: "You haven't logged much this week - time for a catch-up?",
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * Check if user should receive a nudge
   */
  static shouldShowNudge(lastNudgeTime, nudgeType = 'general') {
    const now = new Date();
    const lastNudge = lastNudgeTime ? new Date(lastNudgeTime) : null;

    if (!lastNudge) return true;

    const timeSinceLastNudge = now.getTime() - lastNudge.getTime();
    const hoursSinceLastNudge = timeSinceLastNudge / (1000 * 60 * 60);

    // Don't show nudges more than once per hour
    if (hoursSinceLastNudge < 1) return false;

    // Different intervals for different nudge types
    const intervals = {
      general: 2, // 2 hours
      meeting: 0.25, // 15 minutes
      weekly: 24 * 7 // 1 week
    };

    return hoursSinceLastNudge >= (intervals[nudgeType] || intervals.general);
  }

  /**
   * Get nudge configuration for user preferences
   */
  static getNudgeConfig() {
    const config = localStorage.getItem('smartPromptsConfig');
    if (config) {
      return JSON.parse(config);
    }

    // Default configuration
    return {
      enabled: true,
      morningNudges: true,
      afternoonNudges: true,
      eveningNudges: true,
      weeklyNudges: true,
      meetingNudges: true,
      projectNudges: true,
      frequency: 'normal', // low, normal, high
      quietHours: { start: 22, end: 7 } // 10 PM to 7 AM
    };
  }

  /**
   * Save nudge configuration
   */
  static saveNudgeConfig(config) {
    localStorage.setItem('smartPromptsConfig', JSON.stringify(config));
  }

  /**
   * Check if current time is in quiet hours
   */
  static isQuietHours() {
    const config = this.getNudgeConfig();
    const now = new Date();
    const hour = now.getHours();

    if (config.quietHours.start > config.quietHours.end) {
      // Quiet hours span midnight
      return hour >= config.quietHours.start || hour < config.quietHours.end;
    } else {
      // Quiet hours within same day
      return hour >= config.quietHours.start && hour < config.quietHours.end;
    }
  }
}

