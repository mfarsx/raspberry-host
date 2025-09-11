const { spawn } = require("child_process");
const { logger } = require("../config/logger");

/**
 * CommandExecutor - Centralized command execution utility
 *
 * Provides standardized command execution patterns with proper
 * error handling, timeouts, and logging for all external commands.
 */
class CommandExecutor {
  /**
   * Execute a command with arguments
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result with stdout, stderr, exitCode
   */
  static async execute(command, args, options = {}) {
    const {
      cwd = process.cwd(),
      timeout = 30000,
      logger: customLogger = logger,
      description = "Command",
      onProgress = null,
      onError = null,
      sanitizeArgs = true,
      maxOutputLength = 1024 * 1024, // 1MB default
    } = options;

    // Sanitize arguments if requested
    const sanitizedArgs = sanitizeArgs
      ? args.map((arg) => this._sanitizeArg(arg))
      : args;

    customLogger.debug("Executing command", {
      command,
      args: sanitizedArgs,
      cwd,
      timeout,
      description,
    });

    return new Promise((resolve, reject) => {
      const child = spawn(command, sanitizedArgs, {
        cwd,
        stdio: ["pipe", "pipe", "pipe"],
        timeout,
        // Security: Don't inherit environment by default
        env: process.env,
      });

      let stdout = "";
      let stderr = "";
      let isResolved = false;
      let outputTruncated = false;

      const checkOutputLength = (buffer, type) => {
        if (buffer.length > maxOutputLength && !outputTruncated) {
          outputTruncated = true;
          customLogger.warn(`${description} output truncated`, {
            type,
            length: buffer.length,
            maxLength: maxOutputLength,
          });
        }
        return buffer.length > maxOutputLength
          ? buffer.substring(0, maxOutputLength) + "\n... [OUTPUT TRUNCATED]"
          : buffer;
      };

      child.stdout.on("data", (data) => {
        stdout += data.toString();
        stdout = checkOutputLength(stdout, "stdout");

        if (onProgress) {
          try {
            onProgress(data.toString());
          } catch (progressError) {
            customLogger.warn("Progress callback error:", progressError);
          }
        }
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
        stderr = checkOutputLength(stderr, "stderr");

        if (onError) {
          try {
            onError(data.toString());
          } catch (errorCallbackError) {
            customLogger.warn("Error callback error:", errorCallbackError);
          }
        }
      });

      child.on("close", (code, signal) => {
        if (isResolved) return;
        isResolved = true;

        const result = {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
          signal,
          outputTruncated,
        };

        if (code === 0) {
          customLogger.debug(`${description} completed successfully`, {
            exitCode: code,
            stdoutLength: stdout.length,
            stderrLength: stderr.length,
          });
          resolve(result);
        } else {
          const error = new Error(
            `${description} failed with exit code ${code}`
          );
          error.exitCode = code;
          error.stdout = stdout;
          error.stderr = stderr;
          error.signal = signal;
          error.command = command;
          error.args = sanitizedArgs;

          customLogger.error(`${description} failed`, {
            command,
            args: sanitizedArgs,
            exitCode: code,
            signal,
            stderr: stderr.substring(0, 500), // Log first 500 chars of stderr
          });

          reject(error);
        }
      });

      child.on("error", (error) => {
        if (isResolved) return;
        isResolved = true;

        customLogger.error(`${description} process error`, {
          command,
          error: error.message,
          code: error.code,
        });

        const enhancedError = new Error(
          `${description} process failed: ${error.message}`
        );
        enhancedError.originalError = error;
        enhancedError.command = command;
        enhancedError.args = sanitizedArgs;

        reject(enhancedError);
      });

      // Handle timeout
      if (timeout && timeout > 0) {
        const timeoutId = setTimeout(() => {
          if (isResolved) return;
          isResolved = true;

          customLogger.error(`${description} timeout`, {
            command,
            timeout,
            pid: child.pid,
          });

          // Try graceful termination first
          child.kill("SIGTERM");

          // Force kill after 5 seconds if still running
          setTimeout(() => {
            if (child.exitCode === null) {
              child.kill("SIGKILL");
            }
          }, 5000);

          const timeoutError = new Error(
            `${description} timeout after ${timeout}ms`
          );
          timeoutError.timeout = true;
          timeoutError.command = command;
          timeoutError.args = sanitizedArgs;

          reject(timeoutError);
        }, timeout);

        // Clear timeout if process completes normally
        child.on("close", () => {
          clearTimeout(timeoutId);
        });
      }
    });
  }

  /**
   * Execute a Docker command
   * @param {Array} args - Docker command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async executeDockerCommand(args, options = {}) {
    const dockerOptions = {
      ...options,
      description: `Docker ${args[0] || "command"}`,
      timeout: options.timeout || 120000, // 2 minutes default for Docker
    };

    return this.execute("docker", args, dockerOptions);
  }

  /**
   * Execute a Git command
   * @param {Array} args - Git command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async executeGitCommand(args, options = {}) {
    const gitOptions = {
      ...options,
      description: `Git ${args[0] || "command"}`,
      timeout: options.timeout || 300000, // 5 minutes default for Git
    };

    return this.execute("git", args, gitOptions);
  }

  /**
   * Execute a system command (df, ps, etc.)
   * @param {string} command - System command
   * @param {Array} args - Command arguments
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async executeSystemCommand(command, args, options = {}) {
    const systemOptions = {
      ...options,
      description: `System command: ${command}`,
      timeout: options.timeout || 60000, // 1 minute default for system commands
    };

    return this.execute(command, args, systemOptions);
  }

  /**
   * Execute a shell command (sh, bash)
   * @param {string} script - Shell script to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  static async executeShellCommand(script, options = {}) {
    const shellOptions = {
      ...options,
      description: `Shell command`,
      timeout: options.timeout || 120000, // 2 minutes default for shell scripts
      sanitizeArgs: false, // Don't sanitize shell scripts
    };

    return this.execute("sh", ["-c", script], shellOptions);
  }

  /**
   * Check if a command is available in the system
   * @param {string} command - Command to check
   * @returns {Promise<boolean>} True if command is available
   */
  static async isCommandAvailable(command) {
    try {
      await this.execute("which", [command], {
        timeout: 5000,
        description: `Check command availability: ${command}`,
      });
      return true;
    } catch (error) {
      logger.debug(`Command not available: ${command}`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get command version
   * @param {string} command - Command name
   * @param {Array} versionArgs - Arguments to get version (default: ['--version'])
   * @returns {Promise<string>} Version string
   */
  static async getCommandVersion(command, versionArgs = ["--version"]) {
    try {
      const result = await this.execute(command, versionArgs, {
        timeout: 10000,
        description: `Get ${command} version`,
      });
      return result.stdout || result.stderr;
    } catch (error) {
      logger.debug(`Could not get version for ${command}:`, error.message);
      throw new Error(`Unable to determine ${command} version`);
    }
  }

  /**
   * Execute multiple commands in sequence
   * @param {Array} commands - Array of {command, args, options} objects
   * @param {Object} globalOptions - Options applied to all commands
   * @returns {Promise<Array>} Array of execution results
   */
  static async executeSequence(commands, globalOptions = {}) {
    const results = [];

    for (const cmd of commands) {
      const { command, args, options = {} } = cmd;
      const mergedOptions = { ...globalOptions, ...options };

      try {
        const result = await this.execute(command, args, mergedOptions);
        results.push({ success: true, result });
      } catch (error) {
        logger.error("Command sequence failed", {
          command,
          args,
          error: error.message,
          step: results.length + 1,
        });

        results.push({ success: false, error });

        // Stop sequence on failure unless continueOnError is true
        if (!globalOptions.continueOnError) {
          throw new Error(
            `Command sequence failed at step ${results.length}: ${error.message}`
          );
        }
      }
    }

    return results;
  }

  /**
   * Sanitize command argument to prevent injection
   * @param {string} arg - Argument to sanitize
   * @returns {string} Sanitized argument
   * @private
   */
  static _sanitizeArg(arg) {
    if (typeof arg !== "string") {
      return String(arg);
    }

    // Remove potentially dangerous characters
    // Allow alphanumeric, common symbols, and path characters
    return arg.replace(/[;&|`$(){}[\]\\<>]/g, "");
  }

  /**
   * Create a timeout promise for command execution
   * @param {number} ms - Timeout in milliseconds
   * @returns {Promise} Timeout promise
   * @private
   */
  static _createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${ms}ms`));
      }, ms);
    });
  }
}

module.exports = CommandExecutor;
