import simpleGit, { SimpleGit } from "simple-git";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { apiClient } from "./api";

// Simple spinner implementation since ora v5 has import issues
class SimpleSpinner {
  private message: string;
  private interval: NodeJS.Timeout | null = null;
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private currentFrame = 0;

  constructor(message: string) {
    this.message = message;
  }

  // Add setter for message text
  set text(newMessage: string) {
    this.message = newMessage;
  }

  start(): this {
    process.stdout.write(this.message);
    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${this.frames[this.currentFrame]} ${this.message}`
      );
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 80);
    return this;
  }

  succeed(message: string): void {
    this.stop();
    console.log(`\r✅ ${message}`);
  }

  fail(message: string): void {
    this.stop();
    console.log(`\r❌ ${message}`);
  }

  private stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write("\r");
  }
}

function ora(message: string): SimpleSpinner {
  return new SimpleSpinner(message);
}

export class GitManager {
  public git: SimpleGit;

  constructor(cwd?: string) {
    this.git = simpleGit(cwd);
  }

  /**
   * Clone a repository to a local directory
   * Supports private repositories if GitHub is connected
   */
  async cloneRepository(repoUrl: string, targetDir: string): Promise<void> {
    const spinner = ora(`Cloning repository from ${repoUrl}...`).start();

    try {
      // Ensure target directory doesn't exist
      if (fs.existsSync(targetDir)) {
        spinner.fail(chalk.red(`Directory ${targetDir} already exists`));
        throw new Error(`Directory ${targetDir} already exists`);
      }

      // Check if this is a GitHub URL that might need authentication
      const isGitHub = repoUrl.includes('github.com');
      let authenticatedUrl = repoUrl;

      if (isGitHub) {
        try {
          // Try to get GitHub token for private repo access
          const tokenData = await apiClient.getGitHubToken();
          
          if (tokenData.success && tokenData.token) {
            // Inject token into URL for authenticated cloning
            authenticatedUrl = this.injectTokenIntoUrl(repoUrl, tokenData.token);
            spinner.text = `Cloning repository (authenticated)...`;
          }
        } catch (error: any) {
          // If token retrieval fails (e.g., not connected), try without auth
          // This is fine for public repositories
          if (error.response?.status === 404) {
            spinner.text = `Cloning repository (public)...`;
          }
        }
      }

      // Clone the repository
      await this.git.clone(authenticatedUrl, targetDir);

      spinner.succeed(chalk.green(`Repository cloned to ${targetDir}`));
    } catch (error: any) {
      // Check if error is due to authentication
      if (error.message.includes('Authentication failed') || 
          error.message.includes('could not read Username') ||
          error.message.includes('Repository not found')) {
        spinner.fail(chalk.red(`Failed to clone repository: Authentication required`));
        console.log(chalk.yellow('\n💡 This might be a private repository.'));
        console.log(chalk.blue('   Connect your GitHub account: mexty github-login\n'));
      } else {
        spinner.fail(chalk.red(`Failed to clone repository: ${error.message}`));
      }
      throw error;
    }
  }

  /**
   * Inject GitHub token into repository URL for authenticated access
   */
  private injectTokenIntoUrl(repoUrl: string, token: string): string {
    // Handle HTTPS URLs
    if (repoUrl.startsWith('https://github.com/')) {
      return repoUrl.replace('https://github.com/', `https://${token}@github.com/`);
    }
    
    // Handle SSH URLs (convert to HTTPS with token)
    if (repoUrl.startsWith('git@github.com:')) {
      const path = repoUrl.replace('git@github.com:', '');
      return `https://${token}@github.com/${path}`;
    }

    // Return original URL if format not recognized
    return repoUrl;
  }

  /**
   * Check if current directory is a Git repository
   */
  async isGitRepository(dir?: string): Promise<boolean> {
    try {
      const git = dir ? simpleGit(dir) : this.git;
      await git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current repository's remote URL
   */
  async getRemoteUrl(dir?: string): Promise<string | null> {
    try {
      const git = dir ? simpleGit(dir) : this.git;
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((remote) => remote.name === "origin");
      return origin?.refs?.fetch || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  async hasUncommittedChanges(dir?: string): Promise<boolean> {
    try {
      const git = dir ? simpleGit(dir) : this.git;
      const status = await git.status();
      return !status.isClean();
    } catch (error) {
      return false;
    }
  }

  /**
   * Push current branch to remote
   */
  async pushToRemote(dir?: string): Promise<void> {
    const spinner = ora("Pushing changes to remote repository...").start();

    try {
      const git = dir ? simpleGit(dir) : this.git;

      // Get current branch
      const status = await git.status();
      const currentBranch = status.current;

      if (!currentBranch) {
        throw new Error("No current branch found");
      }

      // Push to remote
      await git.push("origin", currentBranch);

      spinner.succeed(chalk.green("Changes pushed to remote repository"));
    } catch (error: any) {
      spinner.fail(chalk.red(`Failed to push changes: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(dir?: string): Promise<{
    branch: string;
    remoteUrl: string | null;
    hasChanges: boolean;
  }> {
    const git = dir ? simpleGit(dir) : this.git;

    const status = await git.status();
    const remoteUrl = await this.getRemoteUrl(dir);

    return {
      branch: status.current || "unknown",
      remoteUrl,
      hasChanges: !status.isClean(),
    };
  }

  /**
   * Extract repository name from URL
   */
  static extractRepoName(gitUrl: string): string {
    // Handle both SSH and HTTPS URLs
    const match = gitUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    if (match) {
      return match[1];
    }

    // Fallback: use the last part of the URL
    const parts = gitUrl.split("/");
    return parts[parts.length - 1].replace(".git", "");
  }

  /**
   * Validate Git URL format
   */
  static isValidGitUrl(url: string): boolean {
    const patterns = [
      /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/,
      /^git@github\.com:[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/,
      /^https:\/\/gitlab\.com\/[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/,
      /^git@gitlab\.com:[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/,
    ];

    return patterns.some((pattern) => pattern.test(url));
  }
}
