import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { apiClient } from '../utils/api';
import { GitManager } from '../utils/git';
import { createInterface } from 'readline';
import { syncCommand } from './sync';
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

// Extract block ID from package.json or git URL
async function findBlockId(): Promise<string | null> {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Look for block ID in package.json name or description
      if (packageJson.name && packageJson.name.startsWith('block-')) {
        return packageJson.name.replace('block-', '');
      }
      
      // Look in description for block ID pattern
      if (packageJson.description) {
        const match = packageJson.description.match(/block[:\s]+([a-f0-9]{24})/i);
        if (match) {
          return match[1];
        }
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not parse package.json'));
    }
  }

  // Try to extract from git remote URL
  try {
    const gitManager = new GitManager();
    const remoteUrl = await gitManager.getRemoteUrl();
    
    if (remoteUrl) {
      const match = remoteUrl.match(/block-([a-f0-9]{24})/);
      if (match) {
        return match[1];
      }
    }
  } catch (error) {
    // Ignore git errors
  }

  return null;
}

export async function publishCommand(): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();
    
    const user = getAuthenticatedUser();
    console.log(chalk.blue('🚀 Publishing block...'));
    console.log(chalk.gray(`   User: ${user?.fullName || user?.email || 'Unknown'}`));

    // Check if we're in a git repository
    const gitManager = new GitManager();
    const isGitRepo = await gitManager.isGitRepository();
    
    if (!isGitRepo) {
      console.error(chalk.red('❌ Not a git repository. Please run this command from a block repository.'));
      process.exit(1);
    }

    // Get repository information
    const repoInfo = await gitManager.getRepositoryInfo();
    console.log(chalk.gray(`   Current branch: ${repoInfo.branch}`));
    console.log(chalk.gray(`   Remote URL: ${repoInfo.remoteUrl}`));

    // Find block ID
    const blockId = await findBlockId();
    if (!blockId) {
      console.error(chalk.red('❌ Could not determine block ID from repository.'));
      console.error(chalk.yellow('   Make sure you are in a block repository created with mexty'));
      process.exit(1);
    }

    console.log(chalk.gray(`   Block ID: ${blockId}`));

    // Check for uncommitted changes
    if (repoInfo.hasChanges) {
      console.log(chalk.yellow('⚠️  You have uncommitted changes.'));
      console.log(chalk.gray('   Please commit your changes before publishing:'));
      console.log(chalk.gray('   git add . && git commit -m "Your commit message"'));
      
      const proceed = await confirm('Do you want to continue anyway?');
      if (!proceed) {
        console.log(chalk.yellow('🚫 Publishing cancelled.'));
        return;
      }
    }

    // Ask user to push changes
    console.log(chalk.blue('\n📤 Push your changes to GitHub:'));
    console.log(chalk.gray(`   git push origin ${repoInfo.branch}`));
    
    const pushed = await confirm('Have you pushed your changes to GitHub?');
    if (!pushed) {
      console.log(chalk.yellow('🚫 Please push your changes first and then run publish again.'));
      return;
    }

    // Trigger save and bundle
    console.log(chalk.yellow('📡 Triggering build and bundle process...'));
    
    try {
      const result = await apiClient.saveAndBundle({ blockId });
      
      console.log(chalk.green('✅ Block published successfully!'));
      console.log(chalk.gray(`   Bundle Path: ${result.bundlePath}`));
      console.log(chalk.gray(`   Federation URL: ${result.federationUrl}`));
      
      if (result.message) {
        console.log(chalk.blue(`   ${result.message}`));
      }

      // Automatically sync registry after successful publish
      console.log(chalk.blue('\n🔄 Auto-syncing registry...'));
      try {
        await syncCommand();
        console.log(chalk.green('✅ Registry synced! Your block is now available as a named component.'));
      } catch (syncError: any) {
        console.warn(chalk.yellow(`⚠️ Registry sync failed: ${syncError.message}`));
        console.log(chalk.gray('   You can manually sync later with: mexty sync'));
        // Don't fail the publish if sync fails - it's not critical
      }
      
    } catch (buildError: any) {
      console.error(chalk.red(`❌ Build failed: ${buildError.message}`));
      console.log(chalk.yellow('   Check the server logs for more details.'));
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to publish block: ${error.message}`));
    process.exit(1);
  }
} 