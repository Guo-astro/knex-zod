#!/usr/bin/env node

/**
 * Demo script for Knex Zod Schema Generator
 * 
 * This script demonstrates the complete workflow of using the Zod utility
 * with a mock PostgreSQL database structure.
 */

const knex = require('../lib/index');

// Mock a Knex instance for demonstration (normally you'd connect to real PostgreSQL)
function createMockKnexInstance() {
  const mockKnex = function(tableName) {
    return {
      columnInfo: () => Promise.resolve(mockTables[tableName] || {})
    };
  };

  mockKnex.client = {
    config: {
      client: 'pg' // Simulate PostgreSQL client
    }
  };

  return mockKnex;
}

// Mock database schema for demonstration
const mockTables = {
  users: {
    id: { type: 'integer', nullable: false },
    name: { type: 'varchar', nullable: false, maxLength: 255 },
    email: { type: 'varchar', nullable: true, maxLength: 255 },
    password_hash: { type: 'varchar', nullable: false, maxLength: 255 },
    is_active: { type: 'boolean', nullable: false, defaultValue: 'true' },
    age: { type: 'integer', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: false, defaultValue: 'now()' },
    updated_at: { type: 'timestamp with time zone', nullable: true },
    profile: { type: 'jsonb', nullable: true },
    avatar_url: { type: 'text', nullable: true }
  },
  
  products: {
    id: { type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()' },
    name: { type: 'varchar', nullable: false, maxLength: 255 },
    description: { type: 'text', nullable: true },
    price: { type: 'numeric', nullable: false },
    in_stock: { type: 'boolean', nullable: false, defaultValue: 'true' },
    category_ids: { type: 'integer[]', nullable: true },
    tags: { type: 'text[]', nullable: true, defaultValue: "'{}'::text[]" },
    metadata: { type: 'jsonb', nullable: true },
    created_at: { type: 'timestamp', nullable: false, defaultValue: 'now()' },
    dimensions: { type: 'point', nullable: true },
    weight: { type: 'real', nullable: true }
  },

  posts: {
    id: { type: 'bigint', nullable: false },
    title: { type: 'varchar', nullable: false, maxLength: 500 },
    content: { type: 'text', nullable: false },
    author_id: { type: 'integer', nullable: false },
    published_at: { type: 'timestamp', nullable: true },
    view_count: { type: 'integer', nullable: false, defaultValue: '0' },
    tags: { type: 'text[]', nullable: true },
    metadata: { type: 'jsonb', nullable: true },
    is_published: { type: 'boolean', nullable: false, defaultValue: 'false' }
  }
};

async function runDemo() {
  console.log('🚀 Knex Zod Schema Generator Demo\n');
  
  const mockKnex = createMockKnexInstance();
  const { createSelectSchema } = knex.ZodUtility;

  try {
    // Demo 1: Basic schema generation
    console.log('📋 Demo 1: Basic User Schema Generation');
    console.log('=====================================');
    const userSchema = await createSelectSchema(mockKnex, 'users');
    console.log(userSchema);
    console.log();

    // Demo 2: Public API schema (exclude sensitive fields)
    console.log('🔒 Demo 2: Public User Schema (Security)');
    console.log('========================================');
    const publicUserSchema = await createSelectSchema(mockKnex, 'users', {
      exclude: ['password_hash']
    });
    console.log(publicUserSchema);
    console.log();

    // Demo 3: Complex product schema with various PostgreSQL types
    console.log('📦 Demo 3: Complex Product Schema');
    console.log('=================================');
    const productSchema = await createSelectSchema(mockKnex, 'products');
    console.log(productSchema);
    console.log();

    // Demo 4: Selective column inclusion
    console.log('🎯 Demo 4: Selective Post Schema');
    console.log('================================');
    const postPreviewSchema = await createSelectSchema(mockKnex, 'posts', {
      columns: ['id', 'title', 'author_id', 'published_at', 'view_count']
    });
    console.log(postPreviewSchema);
    console.log();

    // Demo 5: Passthrough mode for flexible APIs
    console.log('🔄 Demo 5: Flexible Schema (Passthrough Mode)');
    console.log('==============================================');
    const flexibleUserSchema = await createSelectSchema(mockKnex, 'users', {
      strict: false,
      exclude: ['password_hash']
    });
    console.log(flexibleUserSchema);
    console.log();

    // Demo 6: Show how different PostgreSQL types are mapped
    console.log('🗺️  Demo 6: PostgreSQL Type Mappings');
    console.log('====================================');
    const { mapPgTypeToZod } = knex.ZodUtility;
    
    const typeMappings = [
      ['varchar(255)', { nullable: false, maxLength: 255 }],
      ['integer', { nullable: false }],
      ['boolean', { nullable: false, defaultValue: 'true' }],
      ['timestamp with time zone', { nullable: false }],
      ['uuid', { nullable: false }],
      ['jsonb', { nullable: true }],
      ['text[]', { nullable: true }],
      ['numeric(10,2)', { nullable: false }],
      ['point', { nullable: true }],
      ['inet', { nullable: true }]
    ];

    typeMappings.forEach(([pgType, columnInfo]) => {
      const zodSchema = mapPgTypeToZod(pgType, columnInfo);
      console.log(`${pgType.padEnd(25)} → ${zodSchema}`);
    });
    console.log();

    // Demo 7: Usage example with validation
    console.log('✅ Demo 7: Example Usage in Application');
    console.log('======================================');
    console.log(`
// In your application:
import knex from 'knex';
import { z } from 'zod';

const db = knex({
  client: 'pg',
  connection: { /* your connection config */ }
});

// Generate schema for user validation
const userSchema = await knex.ZodUtility.createSelectSchemaObject(
  db, 'users', z, { exclude: ['password_hash'] }
);

// Use in API endpoint
app.post('/api/users', async (req, res) => {
  try {
    const validatedUser = userSchema.parse(req.body);
    // User data is now validated and type-safe
    const result = await db('users').insert(validatedUser);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
    `);

    console.log('🎉 Demo completed successfully!');
    console.log('\n📚 Next Steps:');
    console.log('- Install Zod: npm install zod');
    console.log('- Connect to your PostgreSQL database');
    console.log('- Use knex.ZodUtility.createSelectSchema() in your application');
    console.log('- Check the documentation in lib/util/zod/README.md');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo, mockTables };
