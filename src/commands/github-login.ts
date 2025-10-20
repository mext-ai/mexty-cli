import chalk from 'chalk';
import open from 'open';
import { apiClient } from '../utils/api';
import { requireAuthentication } from '../utils/auth';

async function wait(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export async function githubLoginCommand(): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();

    console.log(chalk.blue('🔐 GitHub Authentication'));
    console.log(chalk.gray('   Connecting your GitHub account for private repository access\n'));

    // Check if already connected
    try {
      const status = await apiClient.getGitHubStatus();
      if (status.connected) {
        console.log(chalk.green('✅ GitHub already connected!'));
        console.log(chalk.gray(`   Username: ${status.githubUsername}`));
        console.log(chalk.gray(`   Status: ${status.message}\n`));
        
        console.log(chalk.yellow('To disconnect and reconnect, run: mexty github-disconnect'));
        return;
      }
    } catch (error: any) {
      // If status check fails, continue with login
      console.log(chalk.yellow('⚠️  Could not check GitHub status, proceeding with login...'));
    }

    // Get GitHub OAuth URL
    console.log(chalk.yellow('📡 Requesting GitHub OAuth URL...'));
    const authData = await apiClient.getGitHubAuthUrl();

    if (!authData.success || !authData.url) {
      console.error(chalk.red(`❌ ${authData.message}`));
      process.exit(1);
    }

    console.log(chalk.green('✅ OAuth URL generated'));
    console.log(chalk.blue('\n🌐 Opening browser for GitHub authentication...'));
    console.log(chalk.gray(`   URL: ${authData.url}\n`));

    // Open browser
    try {
      await open(authData.url);
      console.log(chalk.yellow('👆 Please authorize MEXTY in your browser'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not open browser automatically'));
      console.log(chalk.blue('\nPlease open this URL in your browser:'));
      console.log(chalk.cyan(authData.url));
    }

    console.log(chalk.gray('\n⏳ Waiting for you to authorize...'));
    console.log(chalk.gray('   This may take a moment\n'));

    // Poll for connection status
    let connected = false;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes (2 second intervals)

    while (!connected && attempts < maxAttempts) {
      await wait(2);
      attempts++;

      try {
        const status = await apiClient.getGitHubStatus();
        if (status.connected) {
          connected = true;
          console.log(chalk.green('\n🎉 GitHub connected successfully!'));
          console.log(chalk.gray(`   Username: ${status.githubUsername}`));
          console.log(chalk.gray(`   Status: ${status.message}\n`));
          console.log(chalk.blue('You can now clone private block repositories!'));
          break;
        }
      } catch (error) {
        // Continue polling
      }

      // Show progress indicator every 10 attempts
      if (attempts % 10 === 0) {
        console.log(chalk.gray(`   Still waiting... (${attempts * 2}s)`));
      }
    }

    if (!connected) {
      console.error(chalk.red('\n❌ Authentication timeout'));
      console.log(chalk.yellow('   Please try again: mexty github-login'));
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ GitHub login failed: ${error.message}`));
    
    if (error.response?.status === 401) {
      console.log(chalk.yellow('   Please login first: mexty login'));
    } else if (error.response?.status === 500) {
      console.log(chalk.yellow('   GitHub OAuth may not be configured on the server'));
    }
    
    process.exit(1);
  }
}

