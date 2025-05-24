/**
 * Example usage of Knex Zod Schema Generator
 * 
 * This example demonstrates how to use the createSelectSchema utility
 * to automatically generate Zod validation schemas from PostgreSQL tables.
 */

const knex = require('knex');
const z = require('zod');
const { createSelectSchema, createSelectSchemaObject } = require('./createSelectSchema');

// Configure Knex for PostgreSQL
const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'example_db'
  }
});

async function examples() {
  try {
    // Example 1: Generate schema code as string
    console.log('=== Example 1: Basic Schema Generation ===');
    const userSchemaCode = await createSelectSchema(db, 'users');
    console.log('Generated schema code:');
    console.log(userSchemaCode);
    console.log();

    // Example 2: Generate actual Zod schema object
    console.log('=== Example 2: Zod Schema Object ===');
    const userSchema = await createSelectSchemaObject(db, 'users', z);
    
    // Test validation
    const validUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      is_active: true,
      created_at: '2023-01-01T00:00:00Z'
    };
    
    try {
      const parsed = userSchema.parse(validUser);
      console.log('✅ Valid user:', parsed);
    } catch (error) {
      console.log('❌ Validation error:', error.errors);
    }
    console.log();

    // Example 3: Selective column inclusion
    console.log('=== Example 3: Column Selection ===');
    const publicUserSchema = await createSelectSchema(db, 'users', {
      columns: ['id', 'name', 'email']
    });
    console.log('Public user schema:');
    console.log(publicUserSchema);
    console.log();

    // Example 4: Column exclusion
    console.log('=== Example 4: Column Exclusion ===');
    const safeUserSchema = await createSelectSchema(db, 'users', {
      exclude: ['password', 'password_hash']
    });
    console.log('Safe user schema (no sensitive fields):');
    console.log(safeUserSchema);
    console.log();

    // Example 5: Passthrough mode
    console.log('=== Example 5: Passthrough Mode ===');
    const flexibleSchema = await createSelectSchema(db, 'users', {
      strict: false
    });
    console.log('Flexible schema (allows extra properties):');
    console.log(flexibleSchema);
    console.log();

    // Example 6: Complex table with various PostgreSQL types
    console.log('=== Example 6: Complex Table ===');
    const productSchemaCode = await createSelectSchema(db, 'products');
    console.log('Product schema with various PostgreSQL types:');
    console.log(productSchemaCode);
    console.log();

    // Example 7: Using generated schema for API validation
    console.log('=== Example 7: API Validation ===');
    const postSchema = await createSelectSchemaObject(db, 'posts', z);
    
    // Simulate API request data
    const apiData = {
      id: 123,
      title: 'How to use Knex with Zod',
      content: 'This is a comprehensive guide...',
      author_id: 1,
      published_at: '2023-12-01T10:00:00Z',
      tags: ['knex', 'zod', 'typescript'],
      metadata: { views: 0, likes: 0 }
    };
    
    try {
      const validatedPost = postSchema.parse(apiData);
      console.log('✅ Valid API data:', validatedPost.title);
    } catch (error) {
      console.log('❌ API validation error:', error.errors);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

// Example SQL schema that these examples assume:
const exampleSchema = `
-- Example PostgreSQL schema for the demo

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  profile JSONB,
  avatar_url TEXT
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  category_ids INTEGER[],
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now(),
  dimensions POINT,
  weight REAL
);

CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  published_at TIMESTAMP,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  view_count INTEGER DEFAULT 0
);
`;

console.log('Example PostgreSQL schema:');
console.log(exampleSchema);
console.log();

// Run examples (uncomment to execute)
// examples().catch(console.error);

module.exports = {
  examples,
  exampleSchema
};
