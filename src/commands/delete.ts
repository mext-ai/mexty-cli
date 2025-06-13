import chalk from 'chalk';
import { apiClient } from '../utils/api';
import { createInterface } from 'readline';
import { requireAuthentication, getAuthenticatedUser } from '../utils/auth';

// Simple confirmation function
async function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
    });
  });
}

export async function deleteCommand(blockId: string): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();
    
    const user = getAuthenticatedUser();
    console.log(chalk.blue(`🗑️  Deleting block: ${blockId}`));
    console.log(chalk.gray(`   User: ${user?.fullName || user?.email || 'Unknown'}`));

    // Get block info first
    console.log(chalk.yellow('📡 Fetching block information...'));
    const block = await apiClient.getBlock(blockId);
    
    console.log(chalk.gray(`   Title: ${block.title}`));
    console.log(chalk.gray(`   Description: ${block.description}`));
    if (block.gitUrl) {
      console.log(chalk.gray(`   GitHub URL: ${block.gitUrl}`));
    }

    // Confirm deletion
    const confirmed = await confirm(chalk.red('Are you sure you want to delete this block? This action cannot be undone.'));
    
    if (!confirmed) {
      console.log(chalk.yellow('🚫 Deletion cancelled.'));
      return;
    }

    // Delete the block
    console.log(chalk.yellow('📡 Deleting block on server...'));
    await apiClient.deleteBlock(blockId);
    
    console.log(chalk.green(`✅ Block deleted successfully!`));
    
    if (block.gitUrl) {
      console.log(chalk.yellow('⚠️  Note: The GitHub repository still exists and needs to be deleted manually if desired.'));
      console.log(chalk.gray(`   Repository: ${block.gitUrl}`));
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to delete block: ${error.message}`));
    process.exit(1);
  }
} 