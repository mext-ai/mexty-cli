# MEXTY Blocks: Interactive Reusable Components

## What are Blocks?

Blocks are **interactive, reusable, and customizable React components** that can be embedded anywhere. They are the core building blocks of the MEXTY platform, designed to create rich, engaging experiences that can be easily shared and integrated.

## Key Characteristics

### 1. **Interactive**

- Blocks are fully functional React components with state management
- Support user interactions like clicks, form inputs, animations, and real-time updates
- Can include complex UI elements like charts, games, quizzes, media players, etc.

### 2. **Reusable**

- Once created, blocks can be used multiple times across different contexts
- Published blocks can be discovered and used by other users
- Blocks maintain their functionality regardless of where they're embedded

### 3. **Customizable via Props**

- Blocks accept **props** (properties) that allow customization without code changes
- Props can be of various types: strings, numbers, booleans, colors, URLs, arrays, objects
- Users can modify block behavior and appearance through a visual props editor

## Props System

The props system is the heart of block customization:

### Supported Prop Types

- **String**: Text content, labels, descriptions
- **Number**: Quantities, dimensions, durations
- **Boolean**: Toggle features on/off
- **Color**: Theme colors, backgrounds, text colors
- **Image URL**: Pictures, icons, backgrounds
- **Video URL**: Video content, tutorials
- **Audio URL**: Sound effects, music, narration
- **3D Model URL**: GLB/GLTF files for 3D content
- **Array**: Lists of items, datasets
- **Object**: Complex nested configurations
- **Enum**: Predefined choices (dropdown selections)

### Props Editor Features

- **Visual Interface**: No code required to customize blocks
- **Real-time Preview**: See changes instantly as you edit props
- **Media Integration**: Upload files, select from workspace, or use AI generation
- **Nested Objects**: Support for complex data structures
- **Array Management**: Add/remove items dynamically
- **Type Validation**: Ensures props match expected types

## Block Structure

### Core Files

```
block-repository/
├── src/
│   ├── block.tsx          # Main component (receives props)
│   ├── App.tsx            # Wrapper component
│   └── index.tsx          # Entry point
├── package.json           # Dependencies and metadata
├── webpack.config.js      # Build configuration
└── index.html            # Development preview
```

### Example Block Component

```tsx
interface BlockProps {
  title: string;
  color: string;
  items: Array<{
    name: string;
    value: number;
  }>;
  showAnimation: boolean;
}

export default function MyBlock(props: BlockProps) {
  const { title, color, items, showAnimation } = props;

  return (
    <div style={{ backgroundColor: color }}>
      <h1>{title}</h1>
      {items.map((item, index) => (
        <div key={index} className={showAnimation ? "animate" : ""}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  );
}
```

## Block Lifecycle

### 1. **Creation**

- Use `mexty create block --name "Block Name" --description "Description" --category "category"`
- Automatically creates GitHub repository with template
- Sets up development environment

### 2. **Development**

- Edit `src/block.tsx` to implement functionality
- Define TypeScript interfaces for props
- Test locally with `npm start`

### 3. **Publishing**

- Use `mexty save` to commit changes and trigger build
- System automatically parses props schema from TypeScript interfaces
- Generates federation bundle for embedding

### 4. **Distribution**

- Blocks can be shared privately or published to marketplace
- Published blocks become available as named components
- Can be made insertable by AI agents for automated content creation

## Props Schema Auto-Detection

The system automatically analyzes your block's TypeScript interface to generate a props schema:

```tsx
interface BlockProps {
  title: string; // → String input
  count: number; // → Number input
  enabled: boolean; // → Toggle switch
  color: string; // → Color picker (if name contains 'color')
  imageUrl: string; // → Image selector (if name contains 'image')
  options: string[]; // → Array of strings
  config: {
    // → Nested object
    theme: "light" | "dark"; // → Enum dropdown
    size: number;
  };
}
```

## Use Cases

### Educational Content

- Interactive quizzes and assessments
- Data visualizations and charts
- Simulations and experiments
- Progress trackers

### Business Applications

- Product showcases
- Pricing calculators
- Contact forms
- Dashboard widgets

### Entertainment

- Mini-games
- Interactive stories
- Media players
- Social widgets

### Marketing

- Call-to-action buttons
- Lead generation forms
- Product demos
- Testimonial carousels

## Integration Methods

### 1. **Direct Embedding**

```html
<iframe src="https://mexty.ai/preview.html?blockId=BLOCK_ID"></iframe>
```

### 2. **React Integration**

```tsx
import { WeatherWidget } from "@mexty/block";

<WeatherWidget location="Paris" showForecast={true} theme="dark" />;
```

### 3. **Federation Module**

```javascript
const RemoteComponent = React.lazy(() => import("FEDERATION_URL"));
```

## AI Agent Integration

Blocks can be marked as "insertable by agent" which allows AI systems to:

- Automatically select appropriate blocks for content
- Generate suitable props based on context
- Insert blocks into courses and pages
- Customize block behavior for specific use cases

## Best Practices

### Props Design

- Use descriptive prop names that indicate their purpose
- Provide sensible default values
- Group related props into objects
- Use enums for predefined choices

### Component Structure

- Keep components focused and single-purpose
- Handle loading and error states gracefully
- Make components responsive and accessible
- Optimize for performance

### Development Workflow

1. Define props interface first
2. Implement component logic
3. Test with various prop combinations
4. Commit and publish with `mexty save`
5. Share or publish to marketplace

## CLI Commands

The MEXTY CLI provides a complete toolkit for block development and publishing:

### Installation

```bash
npm install -g @mexty/cli
```

### Authentication

```bash
mexty login
```

Authenticate with your MEXTY account to access all CLI features.

### Block Creation

```bash
mexty create block --name "Block Name" --description "Description" --category "category"
```

- Creates a new block via the API
- Automatically generates a GitHub repository
- Clones the repository locally
- Changes to the block directory
- Sets up the development environment

**Example:**

```bash
mexty create block --name "Weather Widget" --description "A beautiful weather display component" --category "widget"
```

### Development & Saving

```bash
mexty save
```

- Stages all changes (`git add .`)
- Prompts for commit message
- Commits changes to git
- Pushes to GitHub
- Triggers the save-and-bundle process to build the block

### Publishing to Marketplace

```bash
mexty publish [--agent]
```

- Builds and bundles the block
- Publishes to the marketplace (free only via CLI)
- Makes block discoverable by all users
- Optional `--agent` flag makes block insertable by AI agents (requires Mext staff permissions)

**Example:**

```bash
mexty publish --agent
```

### Block Management

```bash
mexty delete <blockId>
```

Deletes a block (requires ownership).

### Command Workflow

1. **Create a new block:**

   ```bash
   mexty create block --name "My Widget" --description "An awesome widget" --category "utility"
   ```

2. **Develop your block:**

   - Edit `src/block.tsx` to implement your component
   - Define TypeScript interfaces for props
   - Test locally with `npm start`

3. **Save your progress:**

   ```bash
   mexty save
   ```

4. **Publish to marketplace:**
   ```bash
   mexty publish --agent
   ```

### CLI Features

- **Automatic GitHub Integration**: Creates and manages repositories
- **TypeScript Support**: Full TypeScript development environment
- **Props Schema Detection**: Automatically generates props schema from TypeScript interfaces
- **Federation Bundling**: Creates optimized bundles for embedding
- **Marketplace Publishing**: One-command publishing to the marketplace
- **AI Agent Integration**: Optional agent insertability for automated content creation

This system enables rapid creation of interactive content while maintaining consistency, reusability, and ease of customization for end users.

# @mexty/realtime

React hooks for real-time collaborative features using Yjs and Hocuspocus.

## Installation

```bash
npm install @mexty/realtime
```

## Usage

```tsx
import { useCollabSpace } from "@mexty/realtime";

// 🧠 Example 1: Collaborative JSON document editor
export function DocumentEditor({ blockId }: { blockId: string }) {
  const { state, update } = useCollabSpace(`block:${blockId}`, {
    document: {
      title: "Untitled",
      content: "Write something...",
    },
    game: { weights: [] },
  });

  // ✅ Partial update usage
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ document: { ...state.document, title: e.target.value } });
  };

  // ✅ Functional update usage
  const resetContent = () => {
    update((prev) => ({
      ...prev,
      document: { ...prev.document, content: "" },
    }));
  };

  return (
    <div className="p-4 border rounded space-y-3">
      <h2 className="text-lg font-bold">Collaborative Document</h2>
      <input
        type="text"
        className="border p-2 w-full"
        value={state.document.title}
        onChange={handleTitleChange}
      />
      <textarea
        className="border p-2 w-full h-32"
        value={state.document.content}
        onChange={(e) =>
          update({ document: { ...state.document, content: e.target.value } })
        }
      />
      <button
        onClick={resetContent}
        className="bg-blue-500 text-white px-3 py-1 rounded"
      >
        Reset Content
      </button>
    </div>
  );
}

// 🧩 Example 2: Multiplayer tower game state
export function TowerGame({ blockId }: { blockId: string }) {
  const { state, update } = useCollabSpace(`block:${blockId}`, {
    document: {},
    game: { weights: [] as { team: string; pos: number }[] },
  });

  // ✅ Append new weight (functional update)
  const addWeight = (team: string) => {
    update((prev) => ({
      ...prev,
      game: {
        ...prev.game,
        weights: [...prev.game.weights, { team, pos: Math.random() * 100 }],
      },
    }));
  };

  // ✅ Clear game state (partial update)
  const resetGame = () => {
    update({ game: { weights: [] } });
  };

  return (
    <div className="p-4 border rounded space-y-3">
      <h2 className="text-lg font-bold">Tower Game</h2>
      <button
        onClick={() => addWeight("blue")}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        Add Blue Weight
      </button>
      <button
        onClick={() => addWeight("red")}
        className="bg-red-600 text-white px-3 py-1 rounded"
      >
        Add Red Weight
      </button>
      <button
        onClick={resetGame}
        className="bg-gray-600 text-white px-3 py-1 rounded"
      >
        Reset Game
      </button>

      <pre className="bg-gray-100 p-2 text-sm rounded overflow-auto">
        {JSON.stringify(state.game, null, 2)}
      </pre>
    </div>
  );
}
```

## API

### `useCollabSpace(documentName, initialState, options?)`

#### Parameters

- `documentName: string` - Unique identifier for the collaborative document
- `initialState: T` - Initial state object for the collaborative space
- `options?: CollabSpaceOptions` - Optional configuration

#### Returns

- `state: T` - Current collaborative state
- `update: (updateFn: UpdateFunction<T>) => void` - Function to update state
- `isConnected: boolean` - WebSocket connection status
- `connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'` - Detailed connection status
- `userId: string` - Anonymous user ID (persisted in localStorage)

#### Options

```tsx
interface CollabSpaceOptions {
  websocketUrl?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}
```

## Features

- 🔄 Real-time collaborative state synchronization
- 🆔 Anonymous user authentication with persistent IDs
- 🔗 Automatic WebSocket connection management
- 📱 React hooks for easy integration
- 🎯 TypeScript support with full type safety
- 🏗️ Built on Yjs and Hocuspocus for reliability
