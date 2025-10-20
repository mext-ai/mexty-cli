import chalk from "chalk";
import path from "path";
import { apiClient, CreateBlockRequest } from "../utils/api";
import { GitManager } from "../utils/git";
import { createInterface } from "readline";
import { requireAuthentication, getAuthenticatedUser } from "../utils/auth";

interface CreateOptions {
  description?: string;
  type?: string;
  name?: string;
  category?: string;
}

// Simple prompt function to replace inquirer
async function prompt(
  question: string,
  defaultValue?: string
): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const promptText = defaultValue
      ? `${question} (${defaultValue}): `
      : `${question}: `;

    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

export async function createCommand(
  subcommand?: string,
  options: CreateOptions = {}
): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();

    const user = getAuthenticatedUser();

    // Handle both old and new syntax
    let blockName: string;
    let blockDescription: string;
    let blockType: string;

    if (subcommand === "block") {
      // New syntax: mexty create block --name "..." --description "..." --category "..."
      if (!options.name) {
        console.error(
          chalk.red('❌ --name is required when using "mexty create block"')
        );
        console.log(
          chalk.yellow(
            '   Usage: mexty create block --name "Block Name" --description "Description" --category "category"'
          )
        );
        process.exit(1);
      }

      blockName = options.name;
      blockDescription = options.description || `Custom block: ${blockName}`;
      blockType = options.category || options.type || "custom";
    } else {
      // Old syntax: mexty create "Block Name" --description "..." --type "..."
      if (!subcommand) {
        console.error(chalk.red("❌ Block name is required"));
        console.log(
          chalk.yellow('   Usage: mexty create "Block Name" [options]')
        );
        console.log(
          chalk.yellow(
            '   Or: mexty create block --name "Block Name" [options]'
          )
        );
        process.exit(1);
      }

      blockName = subcommand;
      blockDescription = options.description || `Custom block: ${blockName}`;
      blockType = options.type || "custom";
    }

    console.log(chalk.blue(`🚀 Creating new block: ${blockName}`));
    console.log(
      chalk.gray(`   User: ${user?.fullName || user?.email || "Unknown"}`)
    );
    console.log(chalk.gray(`   Category: ${blockType}`));

    // Prepare block data
    const blockData: CreateBlockRequest = {
      blockType: blockType,
      title: blockName,
      description: blockDescription,
      allowedBrickTypes: ["text", "image", "video", "code", "quiz"], // Default allowed types
      scope: ["user-store"], // Default scope for CLI-created blocks
      content: [],
    };

    console.log(chalk.yellow("📡 Creating block on server..."));

    // Create the block
    const block = await apiClient.createBlock(blockData);

    console.log(chalk.green(`✅ Block created successfully!`));
    console.log(chalk.gray(`   Block ID: ${block.id || block._id}`));
    console.log(
      chalk.gray(`   Block Type: ${block.blockType || block._doc?.blockType}`)
    );

    // Add the block to user's structure
    console.log(chalk.yellow("📚 Adding block to your library..."));
    try {
      await apiClient.addBlockToStructure(block.id || block._id);
      console.log(chalk.green(`✅ Block added to your library!`));
    } catch (structureError: any) {
      console.warn(
        chalk.yellow(
          `⚠️  Block created but couldn't add to library: ${structureError.message}`
        )
      );
      console.log(chalk.gray("   The block is still accessible via the API"));
    }

    // Handle both plain objects and Mongoose documents
    const gitUrl = block.gitUrl || block._doc?.gitUrl;
    if (gitUrl) {
      console.log(chalk.gray(`   GitHub URL: ${gitUrl}`));

      const blockId = block.id || block._id;
      
      // Check if user has GitHub connected and needs to accept invitation
      try {
        const githubStatus = await apiClient.getGitHubStatus();
        
        if (githubStatus.connected) {
          // User has GitHub connected, check if they need to accept invitation
          const invitationStatus = await apiClient.checkGitHubInvitationStatus(blockId);
          
          if (!invitationStatus.accepted) {
            // User needs to accept invitation
            console.log(chalk.blue(`\n🔐 GitHub Repository Access Required`));
            console.log(chalk.gray(`   You've been invited as a collaborator to this private repository.`));
            console.log(chalk.gray(`   You must accept the invitation before cloning.\n`));
            
            console.log(chalk.yellow(`📧 Accept your invitation:`));
            console.log(chalk.cyan(`   ${invitationStatus.invitationUrl}\n`));
            
            console.log(chalk.gray(`⏳ Waiting for you to accept the invitation...`));
            console.log(chalk.gray(`   You have 10 minutes. Checking every 5 seconds.\n`));
            
            // Poll for acceptance (10 minutes = 120 attempts at 5 second intervals)
            const maxAttempts = 120;
            const pollInterval = 5000; // 5 seconds
            let attempts = 0;
            let accepted = false;
            
            while (attempts < maxAttempts && !accepted) {
              await new Promise(resolve => setTimeout(resolve, pollInterval));
              attempts++;
              
              try {
                const status = await apiClient.checkGitHubInvitationStatus(blockId);
                if (status.accepted) {
                  accepted = true;
                  console.log(chalk.green(`\n✅ Invitation accepted! Proceeding with clone...\n`));
                  break;
                }
                
                // Show progress every 30 seconds
                if (attempts % 6 === 0) {
                  const elapsed = Math.floor((attempts * pollInterval) / 1000);
                  const remaining = Math.floor(((maxAttempts - attempts) * pollInterval) / 1000);
                  console.log(chalk.gray(`   Still waiting... (${elapsed}s elapsed, ${remaining}s remaining)`));
                }
              } catch (pollError) {
                // Continue polling even if there's an error
              }
            }
            
            if (!accepted) {
              console.error(chalk.red(`\n❌ Timeout: Invitation not accepted within 10 minutes`));
              console.log(chalk.yellow(`\n💡 You can still accept the invitation later and clone manually:`));
              console.log(chalk.gray(`   1. Accept invitation: ${invitationStatus.invitationUrl}`));
              console.log(chalk.gray(`   2. Clone repository: git clone ${gitUrl}`));
              return;
            }
          } else {
            console.log(chalk.green(`✅ GitHub access confirmed`));
          }
        }
      } catch (githubError: any) {
        // Silently skip GitHub invitation check if not connected
      }

      // Clone the repository
      const repoName = GitManager.extractRepoName(gitUrl);
      const targetDir = path.join(process.cwd(), repoName);

      console.log(chalk.yellow(`📦 Cloning repository to ./${repoName}...`));

      try {
        const gitManager = new GitManager();
        await gitManager.cloneRepository(gitUrl, targetDir);

        console.log(
          chalk.green(`🎉 Block created and repository cloned successfully!`)
        );
        console.log(chalk.blue(`\nNext steps:`));
        console.log(chalk.gray(`  1. cd ${repoName}`));
        console.log(chalk.gray(`  2. Make your changes`));
        console.log(chalk.gray(`  3. mexty save`));

        // Change to the cloned directory
        try {
          process.chdir(targetDir);
          console.log(chalk.green(`📁 Changed to directory: ${repoName}`));
        } catch (chdirError: any) {
          console.warn(
            chalk.yellow(
              `⚠️  Could not change to directory: ${chdirError.message}`
            )
          );
          console.log(chalk.gray(`   Please manually run: cd ${repoName}`));
        }
      } catch (cloneError: any) {
        console.error(
          chalk.red(`❌ Failed to clone repository: ${cloneError.message}`)
        );
        console.log(chalk.yellow(`\n💡 This might be a private repository.`));
        console.log(chalk.gray(`   Connect your GitHub account: mexty github-login`));
        console.log(chalk.yellow(`\nYou can manually clone it later:`));
        console.log(chalk.gray(`  git clone ${gitUrl}`));
      }
    } else {
      console.log(
        chalk.yellow(
          "⚠️  No GitHub repository was created (GitHub not configured)"
        )
      );
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to create block: ${error.message}`));
    process.exit(1);
  }
}
