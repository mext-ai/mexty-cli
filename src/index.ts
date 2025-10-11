#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { loginCommand } from "./commands/login";
import { createCommand } from "./commands/create";
import { deleteCommand } from "./commands/delete";
import { publishCommand } from "./commands/publish";
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
