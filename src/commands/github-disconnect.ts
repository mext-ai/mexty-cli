import chalk from 'chalk';
import { createInterface } from 'readline';
import { apiClient } from '../utils/api';
import { requireAuthentication } from '../utils/auth';

// Simple prompt function
async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function githubDisconnectCommand(): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();

    console.log(chalk.blue('🔓 Disconnect GitHub Account'));
    console.log(chalk.gray('   Remove GitHub access from your MEXTY account\n'));

    // Check if connected
    try {
      const status = await apiClient.getGitHubStatus();
      
      if (!status.connected) {
        console.log(chalk.yellow('ℹ️  GitHub is not connected'));
        console.log(chalk.gray('   Nothing to disconnect\n'));
        console.log(chalk.blue('To connect GitHub, run: mexty github-login'));
        return;
      }

      console.log(chalk.yellow('⚠️  Current GitHub connection:'));
      console.log(chalk.gray(`   Username: ${status.githubUsername}\n`));

      // Confirm disconnection
      const confirm = await prompt('Are you sure you want to disconnect GitHub? (y/N): ');
      
      if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
        console.log(chalk.gray('Cancelled'));
        return;
      }

      console.log(chalk.yellow('\n🔄 Disconnecting GitHub...'));

      // Disconnect
      const result = await apiClient.disconnectGitHub();

      if (result.success) {
        console.log(chalk.green(`\n✅ ${result.message}`));
        console.log(chalk.gray('   You will no longer be able to clone private repositories'));
        console.log(chalk.blue('\nTo reconnect, run: mexty github-login'));
      } else {
        console.error(chalk.red(`\n❌ ${result.message}`));
        process.exit(1);
      }

    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to disconnect GitHub: ${error.message}`));
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ GitHub disconnect failed: ${error.message}`));
    
    if (error.response?.status === 401) {
      console.log(chalk.yellow('   Please login first: mexty login'));
    }
    
    process.exit(1);
  }
}

