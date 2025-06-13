# MEXT CLI

Command-line interface for managing MEXT blocks and repositories with automatic props schema generation and type-safe component development.

## Installation

### From Source (Development)

```bash
# Navigate to the CLI directory
cd cli

# Install dependencies
npm install

# Build the CLI
npm run build

# Link for global usage (optional)
npm link
```

### Global Installation (Future)

```bash
npm install -g mexty
```

## Prerequisites

- Node.js 16+ installed
- Git installed and configured
- MEXT server running (default: https://api.v2.mext.app)
- GitHub access for repository operations

## Commands

### `mexty login`

Authenticate with MEXT (currently a placeholder).

```bash
mexty login
```

### `mexty create <name>`

Create a new block and clone its repository locally.

```bash
# Basic usage
mexty create "My Block"

# With options
mexty create "My Block" --description "My custom block description" --type custom
```

**Options:**
- `-d, --description <description>`: Block description
- `-t, --type <type>`: Block type (default: custom)

**What it does:**
1. Creates a new block on the MEXT server
2. Automatically creates a GitHub repository (if configured)
3. Clones the repository to your local machine with enhanced template
4. Sets up proper TypeScript props interface structure
5. Provides next steps for development

### `mexty fork <blockId>`

Fork an existing block and pull its content locally.

```bash
mexty fork 507f1f77bcf86cd799439011
```

**What it does:**
1. Creates a fork of the specified block on the MEXT server
2. Creates a new GitHub repository for the fork
3. Clones the forked repository to your local machine
4. Preserves the original props schema for type safety

### `mexty delete <blockId>`

Delete a block from the MEXT server.

```bash
mexty delete 507f1f77bcf86cd799439011
```

**What it does:**
1. Shows block information for confirmation
2. Prompts for confirmation
3. Deletes the block from the server
4. Note: GitHub repository needs to be deleted manually if desired

### `mexty sync`

Sync the block registry, props schemas, and update named exports with TypeScript definitions.

```bash
mexty sync
```

**What it does:**
1. Fetches the latest registry from the MEXT server
2. Downloads all available props schemas for type generation
3. Updates the mext-block package's named exports with proper TypeScript types
4. Generates type definitions for component props
5. Shows available components and their metadata
6. Enables IntelliSense support for all synced components

**When to use:**
- **After someone else publishes a block** and you want to use it as a typed component
- **On a different computer** than where the block was published
- **To get latest props schemas** and type definitions
- **To manually refresh** the registry if components seem outdated

**Note:** This command is automatically executed after a successful `mexty publish` on the same machine, so you typically don't need to run it manually unless you're on a different computer or want to get components published by others.

### `mexty publish`

Publish the current block with automatic props schema parsing and registry synchronization.

```bash
# In your block repository directory
mexty publish
```

**What it does:**
1. Checks if you're in a valid block repository
2. Shows repository status and detects the block ID
3. Checks for uncommitted changes
4. Prompts you to push changes to GitHub
5. **Automatically parses your block.tsx props interface** using AI
6. Generates and stores JSON schema for your component props
7. Triggers the build and bundle process on the server
8. Provides feedback on the build status
9. **Automatically syncs the registry** to make your block available as a typed component
10. Updates local TypeScript definitions for immediate use

**🆕 Auto Props Parsing:**
When you push files via Sandpack editor or publish your block, the system automatically:
- Analyzes your `block.tsx` file
- Extracts the props interface using AI
- Generates JSON schema for validation and typing
- Updates the block's metadata with props information
- Enables type-safe usage across the ecosystem

## Workflow

### Creating a New Block with Type Safety

```bash
# 1. Create and clone the block
mexty create "My Amazing Block"

# 2. Navigate to the repository
cd block-<block-id>

# 3. Define your props interface in src/block.tsx
# Example:
# interface BlockProps {
#   title: string;
#   count?: number;
#   theme: 'light' | 'dark';
#   onAction?: () => void;
# }

# 4. Implement your component logic
# Edit files, add features, etc.

# 5. Commit your changes
git add .
git commit -m "Add amazing features with typed props"

# 6. Push to GitHub
git push origin main

# 7. Publish the block (automatically parses props and syncs registry)
mexty publish
```

**What happens automatically:**
- Your props interface is parsed by AI and converted to JSON schema
- Type definitions are generated for your component
- Registry is updated with your new typed component
- Other developers can immediately use your component with full IntelliSense

### Using Typed Components

After publishing or syncing, you can use components with full type safety:

```tsx
// Full TypeScript support with IntelliSense
import { MyAmazingBlock } from '@mexty/block';

// Props are fully typed - you get autocompletion and error checking
<MyAmazingBlock 
  props={{
    title: "Hello World",        // ✅ Required string
    count: 42,                   // ✅ Optional number
    theme: "dark",               // ✅ Must be 'light' | 'dark'
    onAction: () => console.log('clicked') // ✅ Optional function
  }}
/>

// Runtime validation (optional)
<MyAmazingBlock 
  validateProps 
  props={{ title: "Hello" }}
  onError={(error) => console.log('Props validation failed:', error)}
/>
```

### Forking an Existing Block

```bash
# 1. Fork and clone the block
mexty fork 507f1f77bcf86cd799439011

# 2. Navigate to the repository
cd block-<new-block-id>

# 3. Make your modifications
# Customize the forked block

# 4. Follow steps 4-6 from "Creating a New Block"
# Note: publish automatically syncs the registry
```

### Multi-Developer Team Workflow

**Developer A (Publishing a new block):**
```bash
mexty create "Team Component"
cd block-<id>
# Define props interface in block.tsx:
# interface TeamComponentProps {
#   teamName: string;
#   members: Array<{ name: string; role: string }>;
#   theme?: 'corporate' | 'casual';
# }
git add . && git commit -m "Add team component with typed props"
git push origin main
mexty publish  # Automatically parses props and syncs registry locally
```

**Developer B (Using the new component on different computer):**
```bash
# First, sync to get the latest components and their type definitions
mexty sync

# Then use in your React app with full TypeScript support
import { TeamComponent } from '@mexty/block';

<TeamComponent 
  props={{
    teamName: "Engineering",
    members: [
      { name: "Alice", role: "Frontend" },
      { name: "Bob", role: "Backend" }
    ],
    theme: "corporate"
  }}
/>
```

## Advanced Features

### Props Schema Auto-Generation

The MEXT system automatically analyzes your TypeScript interfaces and generates JSON schemas for:

- **Type validation**: Runtime props checking
- **Default values**: Automatic application of defaults
- **IntelliSense**: Full IDE support with autocompletion
- **Documentation**: Automatic props documentation from JSDoc comments

**Example props interface that gets auto-parsed:**
```tsx
interface BlockProps {
  /** The main title to display */
  title: string;
  
  /** Optional subtitle text */
  subtitle?: string;
  
  /** Number of items to show (defaults to 10) */
  count?: number;
  
  /** Visual theme variant */
  theme: 'light' | 'dark' | 'auto';
  
  /** Custom styling overrides */
  customStyles?: React.CSSProperties;
  
  /** Click event handler */
  onClick?: (event: MouseEvent) => void;
}
```

Gets converted to JSON schema automatically for runtime validation and type generation.

### Typed Component Creation

For advanced use cases, you can create strongly typed components:

```tsx
import { createTypedBlock } from '@mexty/block';

interface GameProps {
  level: number;
  playerName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  onGameOver?: (score: number) => void;
}

// Creates a component with full TypeScript support
const TypedGame = createTypedBlock<GameProps>('VirtualGame', {
  defaultProps: {
    level: 1,
    difficulty: 'easy'
  },
  validateProps: true
});

// Usage with full type safety
<TypedGame props={{ level: 5, playerName: "Alice", difficulty: "hard" }} />
```

## Configuration

The CLI uses the following default settings:

- **Server URL**: https://api.v2.mext.app
- **Timeout**: 30 seconds for API requests
- **Props Parsing**: Automatic on publish/push
- **Type Generation**: Automatic on sync

## API Integration

The CLI integrates with several new server endpoints:

- `GET /api/blocks/sync` - Full registry and props schema sync
- `GET /api/blocks/:blockId/props-schema` - Get specific props schema
- `POST /api/blocks/:blockId/reparse-props` - Force re-parse props schema

## Troubleshooting

### "Network Error: Could not reach MEXT server"

Make sure the MEXT server is running on the expected port (default: 3001).

### "GitHub repository creation failed"

Check that the server has proper GitHub configuration:
- `GITHUB_TOKEN` environment variable
- `GITHUB_USERNAME` environment variable

### "Could not determine block ID from repository"

This happens when running `mexty publish` in a directory that's not a valid block repository. Make sure you're in a directory created by `mexty create` or `mexty fork`.

### "Props parsing failed"

If automatic props parsing fails:
1. Ensure your `block.tsx` has a clear TypeScript interface
2. Check that the interface is properly exported or used in the component
3. Use JSDoc comments for better AI understanding
4. Run `mexty publish` again or manually trigger re-parsing

### "TypeScript definitions not updating"

If you're not getting proper type support:
1. Run `mexty sync` to refresh type definitions
2. Restart your TypeScript language server
3. Check that the component was successfully published and parsed
4. Verify your mext-block package is up to date

### Permission Issues

If you get permission errors, you may need to:
1. Set up GitHub SSH keys properly
2. Ensure your GitHub token has the necessary permissions
3. Check repository access rights

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Project Structure

```
cli/
├── src/
│   ├── commands/          # Individual CLI commands
│   │   ├── login.ts
│   │   ├── create.ts
│   │   ├── fork.ts
│   │   ├── delete.ts
│   │   ├── publish.ts
│   │   └── sync.ts        # Enhanced with props schema sync
│   ├── utils/
│   │   ├── api.ts         # API client for MEXT server
│   │   ├── git.ts         # Git operations utility
│   │   └── types.ts       # Type generation utilities
│   └── index.ts           # Main CLI entry point
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT 