/**
 * Analytics Schema Documentation
 * 
 * This file documents the data relationships and indexing strategy
 * for the CC-Birdee analytics feature.
 */

export interface AnalyticsSchema {
  // Primary Collections
  userProfiles: {
    key: 'userId';
    indexes: ['lastUpdated', 'totalSessions'];
    relationships: {
      sessions: 'one-to-many';
      insights: 'one-to-many';
    };
  };

  analyticsSessions: {
    key: 'sessionId';
    indexes: ['userId', 'timestamp', 'processedAt'];
    relationships: {
      user: 'many-to-one';
      insights: 'one-to-one';
    };
  };

  sessionInsights: {
    key: 'sessionId';
    indexes: ['timestamp', 'effectiveness.taskCompletionRate'];
    relationships: {
      session: 'one-to-one';
      user: 'many-to-one';
    };
  };
}

// Index mappings for efficient queries
export const IndexMappings = {
  // User-based queries
  'user:sessions': 'sessions/by-user/{userId}',
  'user:insights': 'insights/by-user/{userId}',
  'user:recent-activity': 'sessions/by-user/{userId}/recent',
  
  // Time-based queries
  'sessions:by-date': 'sessions/by-date/{date}',
  'sessions:date-range': 'sessions/between/{startDate}/{endDate}',
  
  // Performance queries
  'sessions:high-performing': 'sessions/by-score/above/{threshold}',
  'users:by-skill-level': 'users/by-skill/{skillName}/{level}',
  
  // Pattern queries
  'patterns:by-frequency': 'patterns/by-frequency/{minFrequency}',
  'weaknesses:by-severity': 'weaknesses/by-severity/{severity}'
};

// Query optimization hints
export const QueryOptimizations = {
  // Commonly accessed together - consider denormalization
  userDashboard: [
    'userProfile',
    'recentSessions',
    'weeklyProgress',
    'topRecommendations'
  ],
  
  // Pre-computed aggregations
  aggregations: {
    weeklyStats: 'computed every Sunday night',
    monthlyTrends: 'computed on 1st of month',
    skillProgressions: 'computed after each session'
  },
  
  // Cache strategies
  caching: {
    userProfiles: '1 hour',
    sessionInsights: '24 hours',
    aggregatedStats: '6 hours',
    recommendations: '12 hours'
  }
};

// Data retention policies
export const RetentionPolicies = {
  rawSessions: '90 days',
  processedInsights: '1 year',
  userProfiles: 'indefinite',
  aggregatedStats: '2 years'
};

// Migration strategy from file-based to database
export const MigrationNotes = `
When migrating to a proper database:

1. PostgreSQL recommended for:
   - JSONB support for flexible schema
   - Strong indexing capabilities
   - Full-text search for code examples

2. Table structure:
   - user_profiles (id, data JSONB, created_at, updated_at)
   - analytics_sessions (id, user_id, session_data JSONB, processed_at)
   - session_insights (id, session_id, insights JSONB, created_at)
   - code_examples (id, session_id, code TEXT, context TEXT, timestamp)

3. Indexes needed:
   - user_profiles: (id), (updated_at)
   - analytics_sessions: (user_id), (session_id), (processed_at)
   - session_insights: (session_id), (created_at)
   - code_examples: (session_id), GIN index on code for full-text search

4. Consider using TimescaleDB for time-series optimizations
`;