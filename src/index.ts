#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { loginCommand } from "./commands/login";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { saveCommand } from "./commands/save";
import { updateGitUrlCommand } from "./commands/update-git-url";
import { githubLoginCommand } from "./commands/github-login";
import { githubDisconnectCommand } from "./commands/github-disconnect";
import { apiClient } from "./utils/api";

const program = new Command();

// CLI Configuration
program
  .name("mexty")
  .description(
    "MEXT CLI for managing React microfrontend blocks and components"
  )
  .version("1.12.0");

// Add commands
program
  .command("login")
  .description("Authenticate with MEXT")
  .action(loginCommand);

program
  .command("logout")
  .description("Logout from MEXT")
  .action(async () => {
    try {
      if (!apiClient.isAuthenticated()) {
        console.log(chalk.yellow("⚠️  You are not logged in"));
        return;
      }

      await apiClient.logout();
      console.log(chalk.green("✅ Logged out successfully"));
    } catch (error: any) {
      console.error(chalk.red(`❌ Logout failed: ${error.message}`));
    }
  });

// Support both old and new create syntax
program
  .command("create [subcommand]")
  .description("Create a new React microfrontend block")
  .option("-d, --description <description>", "Block description")
  .option("-t, --type <type>", "Block type", "custom")
  .option("-n, --name <name>", 'Block name (for "create block" syntax)')
  .option(
    "-c, --category <category>",
    'Block category (for "create block" syntax)'
  )
  .action(createCommand);

program
  .command("delete <blockId>")
  .description("Delete a block (requires ownership)")
  .action(deleteCommand);

program
  .command("publish")
  .description("Publish current block to marketplace (free only)")
  .option("--agent", "Make block insertable by AI agents", false)
  .action(publishCommand);

program
  .command("save")
  .description("Save current block (git add, commit, push, and trigger build)")
  .action(saveCommand);

program
  .command("update-git-url [blockId]")
  .description("Update the Git repository URL for a block")
  .option("-u, --url <url>", "New Git URL")
  .option("-r, --reset", "Reset to default Mext URL")
  .action((blockId, options) => {
    updateGitUrlCommand(blockId, options.url, options.reset);
  });

program
  .command("github-login")
  .description("Connect your GitHub account for private repository access")
  .action(githubLoginCommand);

program
  .command("github-disconnect")
  .description("Disconnect your GitHub account")
  .action(githubDisconnectCommand);

program
  .command("github-status")
  .description("Check GitHub connection status")
  .action(async () => {
    try {
      if (!apiClient.isAuthenticated()) {
        console.log(chalk.yellow("⚠️  Please login first: mexty login"));
        return;
      }

      const status = await apiClient.getGitHubStatus();
      
      if (status.connected) {
        console.log(chalk.green("✅ GitHub connected"));
        console.log(chalk.gray(`   Username: ${status.githubUsername}`));
        console.log(chalk.gray(`   Status: ${status.message}`));
      } else {
        console.log(chalk.yellow("❌ GitHub not connected"));
        console.log(chalk.blue("   Connect with: mexty github-login"));
      }
    } catch (error: any) {
      console.error(chalk.red(`❌ Failed to check status: ${error.message}`));
    }
  });

// Error handling
program.on("command:*", () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(" ")}`));
  console.log(chalk.yellow("See --help for a list of available commands."));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
