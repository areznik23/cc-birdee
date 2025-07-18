import { promises as fs } from 'fs';
import path from 'path';
import { UserProfile, AnalyticsSession, SessionInsight } from '../types/user-analytics';

export class AnalyticsStorage {
  private dataDir: string;
  private profilesDir: string;
  private sessionsDir: string;
  private insightsDir: string;

  constructor() {
    // Store analytics data in a dedicated directory
    this.dataDir = path.join(process.env.HOME || '', '.cc-birdee-analytics');
    this.profilesDir = path.join(this.dataDir, 'profiles');
    this.sessionsDir = path.join(this.dataDir, 'sessions');
    this.insightsDir = path.join(this.dataDir, 'insights');
  }

  async initialize(): Promise<void> {
    // Create directory structure if it doesn't exist
    const dirs = [this.dataDir, this.profilesDir, this.sessionsDir, this.insightsDir];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }

  // User Profile Operations
  async saveUserProfile(userId: string, profile: UserProfile): Promise<void> {
    const filePath = path.join(this.profilesDir, `${userId}.json`);
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const filePath = path.join(this.profilesDir, `${userId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const existing = await this.getUserProfile(userId);
    if (!existing) {
      throw new Error(`User profile ${userId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      lastUpdated: new Date()
    };
    
    await this.saveUserProfile(userId, updated);
  }

  // Session Analytics Operations
  async saveAnalyticsSession(session: AnalyticsSession): Promise<void> {
    const filePath = path.join(this.sessionsDir, `${session.session.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2));
  }

  async getAnalyticsSession(sessionId: string): Promise<AnalyticsSession | null> {
    const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async listAnalyticsSessions(limit?: number, offset?: number): Promise<AnalyticsSession[]> {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      // Sort by modification time (newest first)
      const filesWithStats = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(this.sessionsDir, file);
          const stats = await fs.stat(filePath);
          return { file, mtime: stats.mtime };
        })
      );
      
      filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Apply pagination
      const start = offset || 0;
      const end = limit ? start + limit : filesWithStats.length;
      const selectedFiles = filesWithStats.slice(start, end);
      
      // Load and return sessions
      const sessions = await Promise.all(
        selectedFiles.map(async ({ file }) => {
          const filePath = path.join(this.sessionsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(data);
        })
      );
      
      return sessions;
    } catch (error) {
      console.error('Failed to list analytics sessions:', error);
      return [];
    }
  }

  // Session Insights Operations
  async saveSessionInsight(sessionId: string, insight: SessionInsight): Promise<void> {
    const filePath = path.join(this.insightsDir, `${sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(insight, null, 2));
  }

  async getSessionInsight(sessionId: string): Promise<SessionInsight | null> {
    const filePath = path.join(this.insightsDir, `${sessionId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  // Batch Operations
  async getSessionsForUser(userId: string): Promise<AnalyticsSession[]> {
    const allSessions = await this.listAnalyticsSessions();
    // In a real implementation, we'd have a proper index
    // For now, filter in memory (not scalable)
    return allSessions.filter(s => {
      // Assuming sessions have some way to identify the user
      // This would need to be implemented based on actual session structure
      return true; // Placeholder
    });
  }

  // Cleanup Operations
  async deleteOldSessions(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const files = await fs.readdir(this.sessionsDir);
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(this.sessionsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Export/Import Operations
  async exportUserData(userId: string): Promise<{
    profile: UserProfile | null;
    sessions: AnalyticsSession[];
  }> {
    const profile = await this.getUserProfile(userId);
    const sessions = await this.getSessionsForUser(userId);
    
    return { profile, sessions };
  }

  async importUserData(userId: string, data: {
    profile: UserProfile;
    sessions: AnalyticsSession[];
  }): Promise<void> {
    // Save profile
    await this.saveUserProfile(userId, data.profile);
    
    // Save sessions
    for (const session of data.sessions) {
      await this.saveAnalyticsSession(session);
    }
  }
}