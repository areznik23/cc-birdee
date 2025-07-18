import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { FileInfo } from '../types';
import { SESSION_LOG_PATH } from '../constants';

export class FileService {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || this.expandPath(SESSION_LOG_PATH);
  }

  /**
   * Expand tilde in path to home directory
   */
  private expandPath(inputPath: string): string {
    if (inputPath.startsWith('~')) {
      return path.join(os.homedir(), inputPath.slice(1));
    }
    return inputPath;
  }

  /**
   * List all JSONL files in the Claude projects directory
   */
  async listSessionFiles(): Promise<FileInfo[]> {
    try {
      const files = await fs.readdir(this.basePath);
      const fileInfos: FileInfo[] = [];

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const filePath = path.join(this.basePath, file);
        const stats = await fs.stat(filePath);

        fileInfos.push({
          path: filePath,
          name: file,
          size: stats.size,
          lastModified: stats.mtime
        });
      }

      // Sort by last modified date, most recent first
      return fileInfos.sort((a, b) => 
        b.lastModified.getTime() - a.lastModified.getTime()
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Claude projects directory not found: ${this.basePath}`);
      }
      throw error;
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      // Security check: ensure file is within allowed directory
      const resolvedPath = path.resolve(filePath);
      const resolvedBase = path.resolve(this.basePath);
      
      if (!resolvedPath.startsWith(resolvedBase)) {
        throw new Error('Access denied: File is outside allowed directory');
      }

      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const stats = await fs.stat(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      lastModified: stats.mtime
    };
  }

  /**
   * Check if directory exists
   */
  async directoryExists(): Promise<boolean> {
    try {
      await fs.access(this.basePath);
      return true;
    } catch {
      return false;
    }
  }
}