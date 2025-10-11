#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { loginCommand } from "./commands/login";
import { createCommand } from "./commands/create";
import { forkCommand } from "./commands/fork";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
import { syncCommand } from "./commands/sync";
import { saveCommand } from "./commands/save";
import { apiClient } from "./utils/api";

const program = new Command();

// CLI Configuration
program
  .name("mexty")
  .description(
    "MEXT CLI for managing React microfrontend blocks and components"
  )
  .version("1.0.0");

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
  .command("fork <blockId>")
  .description("Fork an existing block and clone its repository")
  .action(forkCommand);

program
  .command("delete <blockId>")
  .description("Delete a block (requires ownership)")
  .action(deleteCommand);

program
  .command("publish")
  .description("Publish current block with automatic bundling")
  .action(publishCommand);

program
  .command("sync")
  .description("Sync block registry and update typed exports")
  .action(syncCommand);

program
  .command("save")
  .description("Save current block (git add, commit, push, and trigger build)")
  .action(saveCommand);

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
