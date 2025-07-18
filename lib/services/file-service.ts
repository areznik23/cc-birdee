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
   * List all JSONL files in the Claude projects directory (recursively)
   */
  async listSessionFiles(): Promise<FileInfo[]> {
    try {
      const fileInfos: FileInfo[] = [];
      
      // Recursively find all JSONL files
      await this.findJsonlFiles(this.basePath, fileInfos);

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
   * Recursively find JSONL files in a directory
   */
  private async findJsonlFiles(dir: string, fileInfos: FileInfo[]): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        await this.findJsonlFiles(fullPath, fileInfos);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const stats = await fs.stat(fullPath);
        
        // Create a display name that includes the project folder
        const relativePath = path.relative(this.basePath, fullPath);
        const projectName = relativePath.split(path.sep)[0];
        const displayName = projectName ? `${projectName}/${entry.name}` : entry.name;
        
        fileInfos.push({
          path: fullPath,
          name: displayName,
          size: stats.size,
          lastModified: stats.mtime
        });
      }
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