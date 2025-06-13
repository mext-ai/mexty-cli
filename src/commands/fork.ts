import chalk from 'chalk';
import path from 'path';
import { apiClient } from '../utils/api';
import { GitManager } from '../utils/git';
import { requireAuthentication, getAuthenticatedUser } from '../utils/auth';

export async function forkCommand(blockId: string): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();
    
    const user = getAuthenticatedUser();
    console.log(chalk.blue(`🍴 Forking block: ${blockId}`));
    console.log(chalk.gray(`   User: ${user?.fullName || user?.email || 'Unknown'}`));

    // Fork the block
    console.log(chalk.yellow('📡 Forking block on server...'));
    const forkedBlock = await apiClient.forkBlock({ blockId });
    
    console.log(chalk.green(`✅ Block forked successfully!`));
    console.log(chalk.gray(`   New Block ID: ${forkedBlock._id}`));
    console.log(chalk.gray(`   Title: ${forkedBlock.title}`));
    console.log(chalk.gray(`   Description: ${forkedBlock.description}`));
    
    if (forkedBlock.gitUrl) {
      console.log(chalk.gray(`   GitHub URL: ${forkedBlock.gitUrl}`));
      
      // Clone the forked repository
      const repoName = GitManager.extractRepoName(forkedBlock.gitUrl);
      const targetDir = path.join(process.cwd(), repoName);
      
      console.log(chalk.yellow(`📦 Cloning forked repository to ./${repoName}...`));
      
      try {
        const gitManager = new GitManager();
        await gitManager.cloneRepository(forkedBlock.gitUrl, targetDir);
        
        console.log(chalk.green(`🎉 Block forked and repository cloned successfully!`));
        console.log(chalk.blue(`\nNext steps:`));
        console.log(chalk.gray(`  1. cd ${repoName}`));
        console.log(chalk.gray(`  2. Make your changes`));
        console.log(chalk.gray(`  3. git add . && git commit -m "Your changes"`));
        console.log(chalk.gray(`  4. mexty publish`));
        
      } catch (cloneError: any) {
        console.error(chalk.red(`❌ Failed to clone repository: ${cloneError.message}`));
        console.log(chalk.yellow(`You can manually clone it later:`));
        console.log(chalk.gray(`  git clone ${forkedBlock.gitUrl}`));
      }
    } else {
      console.log(chalk.yellow('⚠️  No GitHub repository available for this block'));
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to fork block: ${error.message}`));
    process.exit(1);
  }
} 