const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

/**
 * Sanitize Git URL to prevent injection attacks
 * @param {string} url - Git URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeGitUrl(url) {
  if (typeof url !== 'string') {
    throw new Error('URL must be a string');
  }
  
  // Basic URL validation
  const urlPattern = /^(https?|git):\/\/[^\s]+$/;
  if (!urlPattern.test(url)) {
    throw new Error('Invalid Git URL format');
  }
  
  return url.trim();
}

/**
 * Sanitize branch name to prevent injection attacks
 * @param {string} branch - Branch name to sanitize
 * @returns {string} Sanitized branch name
 */
function sanitizeBranchName(branch) {
  if (typeof branch !== 'string') {
    throw new Error('Branch must be a string');
  }
  
  // Allow only safe characters for branch names
  const sanitized = branch.replace(/[^a-zA-Z0-9._\/-]/g, '');
  if (sanitized !== branch) {
    throw new Error('Branch name contains invalid characters');
  }
  
  return sanitized.trim();
}

/**
 * Validate file path to prevent directory traversal
 * @param {string} filePath - Path to validate
 * @param {string} basePath - Base path to restrict to
 * @returns {string} Validated path
 */
function validateFilePath(filePath, basePath) {
  const resolvedPath = path.resolve(basePath, filePath);
  const resolvedBase = path.resolve(basePath);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Path traversal detected');
  }
  
  return resolvedPath;
}

/**
 * Git Service - Handles all Git-related operations
 */
class GitService {
  constructor() {
    this.logger = logger;
  }

  /**
   * Clone a repository to a specific directory
   * @param {string} repository - Repository URL
   * @param {string} branch - Branch to clone
   * @param {string} targetPath - Target directory path
   * @returns {Promise<void>}
   */
  async cloneRepository(repository, branch, targetPath) {
    try {
      // Validate and sanitize inputs
      const sanitizedUrl = sanitizeGitUrl(repository);
      const sanitizedBranch = sanitizeBranchName(branch);
      const sanitizedPath = validateFilePath(targetPath, process.cwd());
      
      // Create target directory
      await fs.mkdir(sanitizedPath, { recursive: true });
      
      return new Promise((resolve, reject) => {
        const child = spawn('git', ['clone', '-b', sanitizedBranch, sanitizedUrl, sanitizedPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000 // 5 minutes timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`Repository cloned: ${sanitizedUrl} (branch: ${sanitizedBranch})`);
            resolve();
          } else {
            const error = new Error(`Failed to clone repository with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to clone repository:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to clone repository:', error);
          reject(new Error(`Failed to clone repository: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to clone repository:', error);
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Pull latest changes from repository
   * @param {string} repositoryPath - Path to the repository
   * @param {string} branch - Branch to pull
   * @returns {Promise<void>}
   */
  async pullLatest(repositoryPath, branch) {
    try {
      const sanitizedPath = validateFilePath(repositoryPath, process.cwd());
      const sanitizedBranch = sanitizeBranchName(branch);
      
      return new Promise((resolve, reject) => {
        const child = spawn('git', ['pull', 'origin', sanitizedBranch], {
          cwd: sanitizedPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 300000 // 5 minutes timeout
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`Repository updated: ${sanitizedPath}`);
            resolve();
          } else {
            const error = new Error(`Failed to pull latest changes with exit code ${code}: ${stderr}`);
            this.logger.error('Failed to pull latest changes:', error);
            reject(error);
          }
        });
        
        child.on('error', (error) => {
          this.logger.error('Failed to pull latest changes:', error);
          reject(new Error(`Failed to pull latest changes: ${error.message}`));
        });
      });
    } catch (error) {
      this.logger.error('Failed to pull latest changes:', error);
      throw new Error(`Failed to pull latest changes: ${error.message}`);
    }
  }

  /**
   * Get repository information
   * @param {string} repositoryPath - Path to the repository
   * @returns {Promise<Object>} Repository information
   */
  async getRepositoryInfo(repositoryPath) {
    try {
      const sanitizedPath = validateFilePath(repositoryPath, process.cwd());
      
      const executeGitCommand = (args) => {
        return new Promise((resolve, reject) => {
          const child = spawn('git', args, {
            cwd: sanitizedPath,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 30000 // 30 seconds timeout
          });
          
          let stdout = '';
          let stderr = '';
          
          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });
          
          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });
          
          child.on('close', (code) => {
            if (code === 0) {
              resolve({ stdout: stdout.trim() });
            } else {
              reject(new Error(`Git command failed with exit code ${code}: ${stderr}`));
            }
          });
          
          child.on('error', (error) => {
            reject(error);
          });
        });
      };

      const [remoteUrl, currentBranch, lastCommit] = await Promise.all([
        executeGitCommand(['config', '--get', 'remote.origin.url']),
        executeGitCommand(['branch', '--show-current']),
        executeGitCommand(['log', '-1', '--format=%H|%s|%an|%ad', '--date=iso'])
      ]);

      const [commitHash, commitMessage, author, commitDate] = lastCommit.stdout.split('|');

      return {
        remoteUrl: remoteUrl.stdout,
        currentBranch: currentBranch.stdout,
        lastCommit: {
          hash: commitHash,
          message: commitMessage,
          author,
          date: new Date(commitDate)
        }
      };
    } catch (error) {
      this.logger.error('Failed to get repository info:', error);
      throw new Error(`Failed to get repository info: ${error.message}`);
    }
  }

  /**
   * Check if repository exists and is accessible
   * @param {string} repository - Repository URL
   * @returns {Promise<boolean>}
   */
  async validateRepository(repository) {
    try {
      const sanitizedUrl = sanitizeGitUrl(repository);
      
      this.logger.info(`Validating repository: ${sanitizedUrl}`);
      
      // Use execAsync with timeout instead of spawn
      const command = `git ls-remote "${sanitizedUrl}"`;
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 10000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      this.logger.info(`Repository validation successful: ${repository}`);
      return true;
      
    } catch (error) {
      this.logger.warn(`Repository validation failed: ${repository}`, error.message);
      return false;
    }
  }
}

module.exports = GitService;
