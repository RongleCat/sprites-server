/**
 * CLAUDE.md 部署服务
 * 在服务启动时将项目的 CLAUDE.md 复制到 ~/.claude/CLAUDE.md
 */

import { mkdir, copyFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { logger } from '../utils/logger';

/**
 * 部署 CLAUDE.md 配置文件
 */
export async function setupClaudeMd(): Promise<void> {
  const sourcePath = join(process.cwd(), 'config', 'CLAUDE.md');
  const targetDir = join(homedir(), '.claude');
  const targetPath = join(targetDir, 'CLAUDE.md');

  try {
    // 检查源文件是否存在
    try {
      await access(sourcePath);
    } catch {
      logger.warn(
        { sourcePath },
        'CLAUDE.md source file not found, skipping deployment'
      );
      return;
    }

    // 确保目标目录存在
    try {
      await access(targetDir);
    } catch {
      await mkdir(targetDir, { recursive: true });
      logger.info({ targetDir }, 'Created .claude directory');
    }

    // 备份现有文件
    try {
      await access(targetPath);
      const backupPath = `${targetPath}.backup`;
      await copyFile(targetPath, backupPath);
      logger.info({ backupPath }, 'Backed up existing CLAUDE.md');
    } catch {
      // 目标文件不存在，无需备份
    }

    // 复制文件
    await copyFile(sourcePath, targetPath);
    logger.info({ sourcePath, targetPath }, 'CLAUDE.md deployed successfully');
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Failed to deploy CLAUDE.md'
    );
    // 不阻塞服务启动
  }
}
