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

This system enables rapid creation of interactive content while maintaining consistency, reusability, and ease of customization for end users.
