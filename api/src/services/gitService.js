const { exec } = require('child_process');
const { promisify } = require('util');
const { logger } = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

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
      await fs.mkdir(targetPath, { recursive: true });
      await execAsync(`git clone -b ${branch} ${repository} ${targetPath}`);
      this.logger.info(`Repository cloned: ${repository} (branch: ${branch})`);
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
      await execAsync(`cd ${repositoryPath} && git pull origin ${branch}`);
      this.logger.info(`Repository updated: ${repositoryPath}`);
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
      const [remoteUrl, currentBranch, lastCommit] = await Promise.all([
        execAsync(`cd ${repositoryPath} && git config --get remote.origin.url`),
        execAsync(`cd ${repositoryPath} && git branch --show-current`),
        execAsync(`cd ${repositoryPath} && git log -1 --format="%H|%s|%an|%ad" --date=iso`)
      ]);

      const [commitHash, commitMessage, author, commitDate] = lastCommit.stdout.trim().split('|');

      return {
        remoteUrl: remoteUrl.stdout.trim(),
        currentBranch: currentBranch.stdout.trim(),
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
      await execAsync(`git ls-remote ${repository}`);
      return true;
    } catch (error) {
      this.logger.warn(`Repository validation failed: ${repository}`, error.message);
      return false;
    }
  }
}

module.exports = GitService;
