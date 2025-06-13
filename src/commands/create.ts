import chalk from 'chalk';
import path from 'path';
import { apiClient, CreateBlockRequest } from '../utils/api';
import { GitManager } from '../utils/git';
import { createInterface } from 'readline';
import { requireAuthentication, getAuthenticatedUser } from '../utils/auth';

interface CreateOptions {
  description?: string;
  type?: string;
}

// Simple prompt function to replace inquirer
async function prompt(question: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const promptText = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

export async function createCommand(name: string, options: CreateOptions): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();
    
    const user = getAuthenticatedUser();
    console.log(chalk.blue(`🚀 Creating new block: ${name}`));
    console.log(chalk.gray(`   User: ${user?.fullName || user?.email || 'Unknown'}`));

    // Get description if not provided
    let description = options.description;
    if (!description) {
      description = await prompt('Enter a description for the block', `Custom block: ${name}`);
    }

    // Prepare block data
    const blockData: CreateBlockRequest = {
      blockType: options.type || 'custom',
      title: name,
      description: description,
      allowedBrickTypes: ['text', 'image', 'video', 'code', 'quiz'], // Default allowed types
      scope: ['user-store'], // Default scope for CLI-created blocks
      content: []
    };

    console.log(chalk.yellow('📡 Creating block on server...'));
    
    // Create the block
    const block = await apiClient.createBlock(blockData);
    
    console.log(chalk.green(`✅ Block created successfully!`));
    console.log(chalk.gray(`   Block ID: ${block._id}`));
    console.log(chalk.gray(`   Block Type: ${block.blockType}`));
    
    if (block.gitUrl) {
      console.log(chalk.gray(`   GitHub URL: ${block.gitUrl}`));
      
      // Clone the repository
      const repoName = GitManager.extractRepoName(block.gitUrl);
      const targetDir = path.join(process.cwd(), repoName);
      
      console.log(chalk.yellow(`📦 Cloning repository to ./${repoName}...`));
      
      try {
        const gitManager = new GitManager();
        await gitManager.cloneRepository(block.gitUrl, targetDir);
        
        console.log(chalk.green(`🎉 Block created and repository cloned successfully!`));
        console.log(chalk.blue(`\nNext steps:`));
        console.log(chalk.gray(`  1. cd ${repoName}`));
        console.log(chalk.gray(`  2. Make your changes`));
        console.log(chalk.gray(`  3. git add . && git commit -m "Your changes"`));
        console.log(chalk.gray(`  4. mexty publish`));
        
      } catch (cloneError: any) {
        console.error(chalk.red(`❌ Failed to clone repository: ${cloneError.message}`));
        console.log(chalk.yellow(`You can manually clone it later:`));
        console.log(chalk.gray(`  git clone ${block.gitUrl}`));
      }
    } else {
      console.log(chalk.yellow('⚠️  No GitHub repository was created (GitHub not configured)'));
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to create block: ${error.message}`));
    process.exit(1);
  }
} 