import chalk from "chalk";
import fs from "fs";
import path from "path";
import { apiClient } from "../utils/api";
import { GitManager } from "../utils/git";
import { createInterface } from "readline";
import { requireAuthentication, getAuthenticatedUser } from "../utils/auth";

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

// Extract block ID from package.json or git URL
async function findBlockId(): Promise<string | null> {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      // Look for block ID in package.json name or description
      if (packageJson.name && packageJson.name.startsWith("block-")) {
        return packageJson.name.replace("block-", "");
      }

      // Look in description for block ID pattern
      if (packageJson.description) {
        const match = packageJson.description.match(
          /block[:\s]+([a-f0-9]{24})/i
        );
        if (match) {
          return match[1];
        }
      }
    } catch (error) {
      console.warn(chalk.yellow("⚠️  Could not parse package.json"));
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

export async function saveCommand(): Promise<void> {
  try {
    // Check authentication first
    requireAuthentication();

    const user = getAuthenticatedUser();
    console.log(chalk.blue("💾 Saving and publishing block..."));
    console.log(
      chalk.gray(`   User: ${user?.fullName || user?.email || "Unknown"}`)
    );

    // Check if we're in a git repository
    const gitManager = new GitManager();
    const isGitRepo = await gitManager.isGitRepository();

    if (!isGitRepo) {
      console.error(
        chalk.red(
          "❌ Not a git repository. Please run this command from a block repository."
        )
      );
      process.exit(1);
    }

    // Get repository information
    const repoInfo = await gitManager.getRepositoryInfo();
    console.log(chalk.gray(`   Current branch: ${repoInfo.branch}`));
    console.log(chalk.gray(`   Remote URL: ${repoInfo.remoteUrl}`));

    // Find block ID
    const blockId = await findBlockId();
    if (!blockId) {
      console.error(
        chalk.red("❌ Could not determine block ID from repository.")
      );
      console.error(
        chalk.yellow(
          "   Make sure you are in a block repository created with mexty"
        )
      );
      process.exit(1);
    }

    console.log(chalk.gray(`   Block ID: ${blockId}`));

    // Check if there are changes to commit
    if (repoInfo.hasChanges) {
      console.log(
        chalk.yellow("📝 Found uncommitted changes, preparing to commit...")
      );

      // Get commit message from user
      const commitMessage = await prompt(
        "Enter commit message",
        "Update block content"
      );

      if (!commitMessage.trim()) {
        console.error(chalk.red("❌ Commit message cannot be empty"));
        process.exit(1);
      }

      // Stage all changes
      console.log(chalk.yellow("📋 Staging changes (git add .)..."));
      try {
        await gitManager.git.add(".");
        console.log(chalk.green("✅ Changes staged successfully"));
      } catch (addError: any) {
        console.error(
          chalk.red(`❌ Failed to stage changes: ${addError.message}`)
        );
        process.exit(1);
      }

      // Commit changes
      console.log(chalk.yellow(`💬 Committing changes: "${commitMessage}"...`));
      try {
        await gitManager.git.commit(commitMessage);
        console.log(chalk.green("✅ Changes committed successfully"));
      } catch (commitError: any) {
        console.error(
          chalk.red(`❌ Failed to commit changes: ${commitError.message}`)
        );
        process.exit(1);
      }
    } else {
      console.log(chalk.green("✅ No uncommitted changes found"));
    }

    // Push changes to remote
    console.log(
      chalk.yellow(`📤 Pushing changes to remote (${repoInfo.branch})...`)
    );
    try {
      await gitManager.pushToRemote();
      console.log(chalk.green("✅ Changes pushed successfully"));
    } catch (pushError: any) {
      console.error(
        chalk.red(`❌ Failed to push changes: ${pushError.message}`)
      );
      console.log(
        chalk.yellow(
          "   Please check your network connection and GitHub permissions"
        )
      );
      process.exit(1);
    }

    // Trigger save and bundle
    console.log(chalk.yellow("🏗️  Triggering build and bundle process..."));

    try {
      const result = await apiClient.saveAndBundle({ blockId });

      console.log(chalk.green("🎉 Block saved and published successfully!"));
      console.log(chalk.gray(`   Bundle Path: ${result.bundlePath}`));
      console.log(chalk.gray(`   Federation URL: ${result.federationUrl}`));

      if (result.message) {
        console.log(chalk.blue(`   ${result.message}`));
      }

      console.log(
        chalk.blue("\n📋 Your block is now building in the background.")
      );
      console.log(
        chalk.gray("   You can check the build status in the web interface.")
      );
    } catch (buildError: any) {
      console.error(chalk.red(`❌ Build failed: ${buildError.message}`));
      console.log(chalk.yellow("   Check the server logs for more details."));
      process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to save block: ${error.message}`));
    process.exit(1);
  }
}
