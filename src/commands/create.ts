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
        console.log(chalk.yellow(`You can manually clone it later:`));
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
