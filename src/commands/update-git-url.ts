import chalk from "chalk";
import { apiClient } from "../utils/api";
import { requireAuthentication, getAuthenticatedUser } from "../utils/auth";
import { createInterface } from "readline";

// Simple prompt function
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

// Simple yes/no prompt function
async function promptYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

export async function updateGitUrlCommand(blockId?: string, gitUrl?: string, reset?: boolean) {
  try {
    // Require authentication
    await requireAuthentication();
    const user = getAuthenticatedUser();
    
    console.log(chalk.blue("🔗 Update Block Git URL"));
    console.log(chalk.gray("Update the Git repository URL for a block\n"));

    // Get block ID if not provided
    if (!blockId) {
      blockId = await prompt("Enter block ID");
      if (!blockId) {
        console.error(chalk.red("❌ Block ID is required"));
        process.exit(1);
      }
    }

    // Validate block ID format
    if (!/^[a-f0-9]{24}$/.test(blockId)) {
      console.error(chalk.red("❌ Invalid block ID format"));
      process.exit(1);
    }

    console.log(chalk.blue(`📦 Block ID: ${blockId}`));

    // Get current block information
    try {
      const block = await apiClient.getBlock(blockId);
      console.log(chalk.green(`✅ Found block: ${block.title}`));
      console.log(chalk.gray(`Current Git URL: ${block.gitUrl || "Not set"}`));
      
      // Check if current URL is default
      const isDefaultUrl = block.gitUrl?.startsWith("https://github.com/mext-ai/block-");
      if (isDefaultUrl) {
        console.log(chalk.yellow("ℹ️  Current URL is the default Mext URL"));
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to fetch block: ${error.message}`));
      process.exit(1);
    }

    let newGitUrl: string | undefined;
    let resetToDefault = false;

    // Handle reset option
    if (reset) {
      resetToDefault = true;
      newGitUrl = `https://github.com/mext-ai/block-${blockId}`;
      console.log(chalk.blue(`🔄 Resetting to default URL: ${newGitUrl}`));
    } else if (gitUrl) {
      // Validate provided URL
      const isValidUrl = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/.test(gitUrl);
      if (!isValidUrl) {
        console.error(chalk.red("❌ Invalid Git URL format. Please provide a valid GitHub URL."));
        process.exit(1);
      }
      newGitUrl = gitUrl;
      console.log(chalk.blue(`🔗 New Git URL: ${newGitUrl}`));
    } else {
      // Interactive mode
      const currentBlock = await apiClient.getBlock(blockId);
      const currentUrl = currentBlock.gitUrl || "";
      
      // Ask for new URL
      newGitUrl = await prompt("Enter new Git URL", currentUrl);
      
      if (!newGitUrl) {
        console.error(chalk.red("❌ Git URL is required"));
        process.exit(1);
      }

      // Validate URL format
      const isValidUrl = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+(?:\.git)?$/.test(newGitUrl);
      if (!isValidUrl) {
        console.error(chalk.red("❌ Invalid Git URL format. Please provide a valid GitHub URL."));
        process.exit(1);
      }

      // Check if user wants to reset to default
      if (!newGitUrl.startsWith("https://github.com/mext-ai/block-")) {
        const shouldReset = await promptYesNo("This is not the default Mext URL. Do you want to reset to default instead?");
        if (shouldReset) {
          resetToDefault = true;
          newGitUrl = `https://github.com/mext-ai/block-${blockId}`;
          console.log(chalk.blue(`🔄 Resetting to default URL: ${newGitUrl}`));
        }
      }
    }

    // Confirm the update
    console.log(chalk.yellow(`\n⚠️  About to update Git URL to: ${newGitUrl}`));
    const confirmed = await promptYesNo("Do you want to proceed?");
    
    if (!confirmed) {
      console.log(chalk.gray("❌ Update cancelled"));
      process.exit(0);
    }

    // Update the Git URL
    console.log(chalk.blue("🔄 Updating Git URL..."));
    
    try {
      const result = await apiClient.updateBlockGitUrl(blockId, newGitUrl, resetToDefault);
      
      console.log(chalk.green("✅ Git URL updated successfully!"));
      console.log(chalk.gray(`New URL: ${result.gitUrl}`));
      
      if (result.resetToDefault) {
        console.log(chalk.yellow("🔄 URL was reset to default"));
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to update Git URL: ${error.message}`));
      
      if (error.response?.status === 403) {
        console.error(chalk.red("Access denied. You can only update blocks you own."));
      } else if (error.response?.status === 404) {
        console.error(chalk.red("Block not found."));
      }
      
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}
