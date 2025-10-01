/**
 * Analytics Dashboard - Advanced analytics and insights for ScoBro Logbook
 * Provides comprehensive data visualization and productivity insights
 */

import React, { useState, useEffect } from 'react';
import { AnalyticsService } from '../services/analyticsService';
import { TimeTrackingService } from '../services/timeTrackingService';
import { CalendarService } from '../services/calendarService';
import { JiraApiService } from '../services/jiraApiService';

const AnalyticsDashboard = ({ isOpen, onClose, entries = [] }) => {
  const [analytics, setAnalytics] = useState(null);
  const [config, setConfig] = useState(AnalyticsService.getAnalyticsConfig());
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedChart, setSelectedChart] = useState('productivity');
  const [timeTrackingData, setTimeTrackingData] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadAnalyticsData();
    }
  }, [isOpen, entries, selectedTimeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load time tracking data
      const timers = await TimeTrackingService.getTimeTrackingData();
      setTimeTrackingData(timers);

      // Load calendar events
      const events = await CalendarService.getUpcomingEvents(30);
      setCalendarEvents(events);

      // Load Jira issues
      const issues = await JiraApiService.getRecentIssues(50);
      setJiraIssues(issues);

      // Generate analytics
      const analyticsData = AnalyticsService.generateAnalytics(
        entries,
        timers,
        events,
        issues
      );
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (newConfig) => {
    setConfig(newConfig);
    AnalyticsService.saveAnalyticsConfig(newConfig);
    loadAnalyticsData();
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const dataStr = JSON.stringify(analytics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scoBro-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'achievement': return '🏆';
      case 'encouragement': return '💪';
      case 'suggestion': return '💡';
      case 'insight': return '🔍';
      case 'warning': return '⚠️';
      default: return '📊';
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'achievement': return 'text-green-600 bg-green-50';
      case 'encouragement': return 'text-blue-600 bg-blue-50';
      case 'suggestion': return 'text-yellow-600 bg-yellow-50';
      case 'insight': return 'text-purple-600 bg-purple-50';
      case 'warning': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📊 Analytics Dashboard</h2>
            <p className="text-gray-600">Comprehensive insights and productivity analytics</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📤 Export Data
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last Year</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart Type
                </label>
                <select
                  value={selectedChart}
                  onChange={(e) => setSelectedChart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="productivity">Productivity</option>
                  <option value="projects">Projects</option>
                  <option value="time">Time Tracking</option>
                  <option value="collaboration">Collaboration</option>
                  <option value="trends">Trends</option>
                </select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => handleConfigChange({ ...config, enabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable Analytics</span>
              </label>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating analytics...</p>
              </div>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Entries</p>
                      <p className="text-3xl font-bold">{analytics.overview.totalEntries}</p>
                    </div>
                    <div className="text-4xl opacity-80">📝</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Total Items</p>
                      <p className="text-3xl font-bold">{analytics.overview.totalItems}</p>
                    </div>
                    <div className="text-4xl opacity-80">📋</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Time Tracked</p>
                      <p className="text-3xl font-bold">{analytics.overview.totalTimeTracked}</p>
                    </div>
                    <div className="text-4xl opacity-80">⏱️</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Productivity Score</p>
                      <p className="text-3xl font-bold">{analytics.overview.productivityScore}/100</p>
                    </div>
                    <div className="text-4xl opacity-80">📊</div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              {analytics.insights && analytics.insights.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Insights & Recommendations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.insights.map((insight, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                          <div>
                            <h4 className="font-semibold">{insight.title}</h4>
                            <p className="text-sm mt-1">{insight.message}</p>
                            <div className="flex items-center mt-2 space-x-2">
                              <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                                {insight.category}
                              </span>
                              <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                                Priority: {insight.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Productivity Analytics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Productivity Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Daily Productivity</h4>
                    <div className="space-y-2">
                      {analytics.productivity?.daily?.slice(-7).map((day, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm font-medium">{new Date(day.date).toLocaleDateString()}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">{day.entries} entries</span>
                            <span className="text-sm text-gray-600">{day.items} items</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${day.productivity}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{day.productivity}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Streaks & Consistency</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-green-800">Entry Streak</p>
                          <p className="text-sm text-green-600">Consecutive days with entries</p>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                          {analytics.overview.entryStreak}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-blue-800">Time Tracking Streak</p>
                          <p className="text-sm text-blue-600">Consecutive days with time tracking</p>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {analytics.overview.timeTrackingStreak}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Analytics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Project Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Top Projects</h4>
                    <div className="space-y-3">
                      {analytics.projects?.topProjects?.map((project, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{project.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${project.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{project.count} entries</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Project Distribution</h4>
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p>Project distribution chart would be displayed here</p>
                      <p className="text-sm">(Chart implementation would use a library like Chart.js)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Tracking Analytics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ Time Tracking Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Session Analysis</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Total Sessions</span>
                        <span className="font-medium">{timeTrackingData.length}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Average Duration</span>
                        <span className="font-medium">{analytics.overview.avgTimePerSession}m</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">Total Time</span>
                        <span className="font-medium">{analytics.overview.totalTimeTracked}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Task Breakdown</h4>
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📈</div>
                      <p>Task breakdown chart would be displayed here</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Efficiency</h4>
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">⚡</div>
                      <p>Efficiency metrics would be displayed here</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collaboration Analytics */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🤝 Collaboration Analytics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Top Collaborators</h4>
                    <div className="space-y-3">
                      {analytics.collaboration?.topCollaborators?.map((collaborator, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{collaborator.name}</span>
                          <span className="text-sm text-gray-600">{collaborator.count} interactions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Communication Patterns</h4>
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">💬</div>
                      <p>Communication patterns chart would be displayed here</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integration Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 Integration Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-800">Calendar Sync</p>
                      <p className="text-sm text-blue-600">{calendarEvents.length} events synced</p>
                    </div>
                    <span className="text-2xl">📅</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Jira Integration</p>
                      <p className="text-sm text-green-600">{jiraIssues.length} issues synced</p>
                    </div>
                    <span className="text-2xl">🔗</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium text-purple-800">Time Tracking</p>
                      <p className="text-sm text-purple-600">{timeTrackingData.length} sessions</p>
                    </div>
                    <span className="text-2xl">⏱️</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h3>
              <p className="text-gray-600 mb-4">Enable analytics to start tracking your productivity insights.</p>
              <button
                onClick={() => handleConfigChange({ ...config, enabled: true })}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enable Analytics
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
