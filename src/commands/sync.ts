import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { apiClient } from '../utils/api';

interface BlockRegistryEntry {
  blockId: string;
  componentName: string;
  author?: string; // Username of the author
  title: string;
  description: string;
  version?: string;
  tags?: string[];
  lastUpdated: string;
}

interface BlockRegistry {
  [componentName: string]: BlockRegistryEntry;
}

interface AuthorNamespaceRegistry {
  [author: string]: {
    [componentName: string]: BlockRegistryEntry;
  };
}

export async function syncCommand(): Promise<void> {
  try {
    console.log(chalk.blue('🔄 Syncing block registry...'));

    // Fetch registry from server
    console.log(chalk.yellow('📡 Fetching registry from server...'));
    const response = await fetch('https://api.v2.mext.app/api/blocks/registry');
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const registry: BlockRegistry = data.registry;
    const authorRegistry: AuthorNamespaceRegistry = data.authorRegistry;
    const meta = data.meta;

    console.log(chalk.green(`✅ Registry fetched successfully!`));
    console.log(chalk.gray(`   Total blocks: ${meta.totalBlocks}`));
    console.log(chalk.gray(`   Total components: ${meta.totalComponents}`));
    console.log(chalk.gray(`   Total authors: ${meta.totalAuthors || 0}`));
    console.log(chalk.gray(`   Last updated: ${meta.lastUpdated}`));

    if (Object.keys(registry).length === 0) {
      console.log(chalk.yellow('⚠️  No components found in registry.'));
      console.log(chalk.gray('   Make sure you have built some blocks first using "mexty publish"'));
      return;
    }

    // Display available components
    console.log(chalk.blue('\n📋 Available components (global namespace):'));
    for (const [componentName, entry] of Object.entries(registry)) {
      console.log(chalk.green(`   ${componentName}${entry.author ? chalk.gray(` (by ${entry.author})`) : ''}`));
      console.log(chalk.gray(`      Block ID: ${entry.blockId}`));
      console.log(chalk.gray(`      Title: ${entry.title}`));
      console.log(chalk.gray(`      Description: ${entry.description.substring(0, 60)}${entry.description.length > 60 ? '...' : ''}`));
      console.log(chalk.gray(`      Tags: ${entry.tags?.join(', ') || 'none'}`));
      console.log('');
    }

    // Display author namespaces
    if (Object.keys(authorRegistry).length > 0) {
      console.log(chalk.blue('\n👤 Author namespaces:'));
      for (const [author, components] of Object.entries(authorRegistry)) {
        console.log(chalk.cyan(`   @${author}:`));
        for (const [componentName, entry] of Object.entries(components)) {
          console.log(chalk.green(`     ${componentName}`));
          console.log(chalk.gray(`        Block ID: ${entry.blockId}`));
          console.log(chalk.gray(`        Title: ${entry.title}`));
        }
        console.log('');
      }
    }

    // Generate named exports file and author entry files
    const mextBlockPath = findMextBlockPath();
    if (mextBlockPath) {
      console.log(chalk.blue('🔧 Updating mext-block exports...'));
      await generateNamedExports(mextBlockPath, registry, authorRegistry);
      await generateAuthorEntryFiles(mextBlockPath, authorRegistry);
      console.log(chalk.green(`✅ Exports updated in ${mextBlockPath}`));
      console.log(chalk.gray(`   Generated ${Object.keys(authorRegistry).length} author entry files`));
    } else {
      console.log(chalk.yellow('⚠️  mext-block package not found locally.'));
      console.log(chalk.gray('   Named exports file not generated.'));
    }

    console.log(chalk.green('\n🎉 Registry sync completed!'));

  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to sync registry: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Find the mext-block package path
 */
function findMextBlockPath(): string | null {
  // Look for mext-block in common locations
  const possiblePaths = [
    path.join(process.cwd(), '..', 'mext-block'),
    path.join(process.cwd(), 'mext-block'),
    path.join(process.cwd(), '..', '..', 'mext-block'),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(path.join(possiblePath, 'package.json'))) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(possiblePath, 'package.json'), 'utf8'));
        if (packageJson.name === '@mexty/block' || packageJson.name === '@mexty/block') {
          return possiblePath;
        }
      } catch (error) {
        // Ignore invalid package.json files
      }
    }
  }

  return null;
}

/**
 * Generate named exports file for the mext-block package
 */
async function generateNamedExports(mextBlockPath: string, registry: BlockRegistry, authorRegistry: AuthorNamespaceRegistry): Promise<void> {
  const namedExportsPath = path.join(mextBlockPath, 'src', 'namedExports.ts');
  
  // Generate the file content
  const content = `// Auto-generated file - DO NOT EDIT MANUALLY
// Generated on: ${new Date().toISOString()}
// Total components: ${Object.keys(registry).length}
// Total authors: ${Object.keys(authorRegistry).length}

import { createNamedBlock } from './components/NamedBlock';
import { createAuthorBlock } from './components/AuthorBlock';

// ===== GLOBAL NAMESPACE COMPONENTS =====
${Object.entries(registry).map(([componentName, entry]) => 
`// ${entry.title}${entry.author ? ` (by ${entry.author})` : ''}
// Block ID: ${entry.blockId}
// Description: ${entry.description}
// Tags: ${entry.tags?.join(', ') || 'none'}
export const ${componentName} = createNamedBlock('${componentName}');`
).join('\n\n')}

// Export all global components as an object for convenience
export const NamedComponents = {
${Object.keys(registry).map(componentName => `  ${componentName},`).join('\n')}
};

// Note: Author-specific components are now available via direct imports:
// import { ComponentName } from '@mexty/block/authorname'
// Available authors: ${Object.keys(authorRegistry).join(', ')}

// Registry metadata
export const registryMetadata = {
  totalComponents: ${Object.keys(registry).length},
  totalAuthors: ${Object.keys(authorRegistry).length},
  lastGenerated: '${new Date().toISOString()}',
  components: {
${Object.entries(registry).map(([componentName, entry]) => 
`    ${componentName}: {
      blockId: '${entry.blockId}',
      title: '${entry.title}',
      description: '${entry.description.replace(/'/g, "\\'")}',
      author: '${entry.author || ''}',
      tags: [${entry.tags?.map(tag => `'${tag}'`).join(', ') || ''}],
      lastUpdated: '${entry.lastUpdated}'
    },`
).join('\n')}
  },
  authors: {
${Object.entries(authorRegistry).map(([author, components]) => 
`    ${author}: {
${Object.entries(components).map(([componentName, entry]) => 
`      ${componentName}: {
        blockId: '${entry.blockId}',
        title: '${entry.title}',
        description: '${entry.description.replace(/'/g, "\\'")}',
        tags: [${entry.tags?.map(tag => `'${tag}'`).join(', ') || ''}],
        lastUpdated: '${entry.lastUpdated}'
      },`
).join('\n')}
    },`
).join('\n')}
  }
};
`;

  // Ensure directory exists
  const srcDir = path.dirname(namedExportsPath);
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(namedExportsPath, content, 'utf8');

  // Update the main index.ts to include these exports
  const indexPath = path.join(mextBlockPath, 'src', 'index.ts');
  if (fs.existsSync(indexPath)) {
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Add export for named exports if not already present
    if (!indexContent.includes('export * from \'./namedExports\'')) {
      indexContent += '\n// Auto-generated named exports\nexport * from \'./namedExports\';\n';
      fs.writeFileSync(indexPath, indexContent, 'utf8');
    }
  }
}

/**
 * Generate author-specific entry files for direct imports
 */
async function generateAuthorEntryFiles(mextBlockPath: string, authorRegistry: AuthorNamespaceRegistry): Promise<void> {
  const authorsDir = path.join(mextBlockPath, 'src', 'authors');
  
  // Clean up existing author files
  if (fs.existsSync(authorsDir)) {
    fs.rmSync(authorsDir, { recursive: true, force: true });
  }
  
  // Create authors directory
  fs.mkdirSync(authorsDir, { recursive: true });
  
  // Generate an entry file for each author
  for (const [author, components] of Object.entries(authorRegistry)) {
    const authorDir = path.join(authorsDir, author);
    fs.mkdirSync(authorDir, { recursive: true });
    
    const authorEntryPath = path.join(authorDir, 'index.ts');
    
    // Generate the author's entry file content
    const content = `// Auto-generated author entry file for ${author}
// Generated on: ${new Date().toISOString()}
// Total components: ${Object.keys(components).length}

import { createAuthorBlock } from '../../components/AuthorBlock';

${Object.entries(components).map(([componentName, entry]) => 
`// ${entry.title}
// Block ID: ${entry.blockId}
// Description: ${entry.description}
// Tags: ${entry.tags?.join(', ') || 'none'}
export const ${componentName} = createAuthorBlock('${author}', '${componentName}');`
).join('\n\n')}

// Export all components as default for convenience
export default {
${Object.keys(components).map(componentName => `  ${componentName},`).join('\n')}
};

// Author metadata
export const authorMetadata = {
  author: '${author}',
  totalComponents: ${Object.keys(components).length},
  lastGenerated: '${new Date().toISOString()}',
  components: {
${Object.entries(components).map(([componentName, entry]) => 
`    ${componentName}: {
      blockId: '${entry.blockId}',
      title: '${entry.title}',
      description: '${entry.description.replace(/'/g, "\\'")}',
      tags: [${entry.tags?.map(tag => `'${tag}'`).join(', ') || ''}],
      lastUpdated: '${entry.lastUpdated}'
    },`
).join('\n')}
  }
};
`;

    // Write the author entry file
    fs.writeFileSync(authorEntryPath, content, 'utf8');
    
    console.log(chalk.gray(`   Created entry file for ${author} (${Object.keys(components).length} components)`));
  }
} 