/**
 * Advanced examples of Knex Zod Schema Generator
 * 
 * These examples demonstrate handling of complex PostgreSQL types,
 * edge cases, and advanced usage patterns.
 */

const knex = require('knex');
const z = require('zod');
const { createSelectSchema, createSelectSchemaObject, getEnumValues } = require('./createSelectSchema');

// Configure Knex for PostgreSQL
const db = knex({
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'advanced_db'
  }
});

async function advancedExamples() {
  try {
    console.log('=== Advanced PostgreSQL Type Examples ===\n');

    // Example 1: Tables with Range Types
    console.log('1. Range Types (PostgreSQL 9.2+)');
    console.log('SQL: CREATE TABLE events (id SERIAL, duration INT4RANGE, dates TSTZRANGE);');
    
    // Mock table with range types
    const mockEventTable = {
      id: { type: 'integer', nullable: false },
      duration: { type: 'int4range', nullable: true },
      dates: { type: 'tstzrange', nullable: false },
      price_range: { type: 'numrange', nullable: true }
    };
    
    console.log('Generated Schema:');
    console.log('z.object({');
    console.log('  id: z.number().int(),');
    console.log('  duration: z.string().nullable(),');
    console.log('  dates: z.string(),');
    console.log('  price_range: z.string().nullable()');
    console.log('}).strict()');
    console.log();

    // Example 2: Custom Enum Types
    console.log('2. Custom Enum Types');
    console.log('SQL: CREATE TYPE status_enum AS ENUM (\'active\', \'inactive\', \'pending\');');
    console.log('     CREATE TABLE users (id SERIAL, status status_enum);');
    
    console.log('Generated Schema:');
    console.log('z.object({');
    console.log('  id: z.number().int(),');
    console.log('  status: z.string() // Custom enum mapped to string');
    console.log('}).strict()');
    console.log();

    // Example 3: Complex Arrays
    console.log('3. Multi-dimensional Arrays');
    console.log('SQL: CREATE TABLE matrix (id SERIAL, data INTEGER[][]);');
    
    console.log('Generated Schema:');
    console.log('z.object({');
    console.log('  id: z.number().int(),');
    console.log('  data: z.unknown() // Multi-dimensional arrays mapped to unknown');
    console.log('}).strict()');
    console.log();

    // Example 4: Network and Geometric Types
    console.log('4. Network and Geometric Types');
    console.log('SQL: CREATE TABLE locations (ip INET, coords POINT, area POLYGON);');
    
    console.log('Generated Schema:');
    console.log('z.object({');
    console.log('  ip: z.string(),');
    console.log('  coords: z.string(),');
    console.log('  area: z.string()');
    console.log('}).strict()');
    console.log();

    // Example 5: Best Practices for API Validation
    console.log('5. API Validation Best Practices');
    console.log('================================');
    
    console.log(`
// For API input validation, consider creating specialized schemas:

// 1. Create Schema (exclude auto-generated fields)
const createUserSchema = await createSelectSchema(db, 'users', {
  exclude: ['id', 'created_at', 'updated_at']
});

// 2. Update Schema (exclude immutable fields)
const updateUserSchema = await createSelectSchema(db, 'users', {
  exclude: ['id', 'created_at'],
  strict: false // Allow partial updates
});

// 3. Public API Schema (exclude sensitive fields)
const publicUserSchema = await createSelectSchema(db, 'users', {
  exclude: ['password_hash', 'email_verified_token', 'reset_token']
});

// 4. Search/Filter Schema (only filterable fields)
const userFilterSchema = await createSelectSchema(db, 'users', {
  columns: ['name', 'email', 'is_active', 'created_at'],
  strict: false
});
    `);

    // Example 6: Custom Type Handling
    console.log('6. Custom Type Handling');
    console.log('======================');
    
    console.log(`
// For complex types, you might want to extend the base schemas:

const baseSchema = await createSelectSchemaObject(db, 'products', z);

// Extend with custom validation
const extendedSchema = baseSchema.extend({
  // Override price validation with custom logic
  price: z.number().positive().max(999999.99),
  
  // Add custom validation for JSON fields
  metadata: z.record(z.unknown()).optional(),
  
  // Custom enum validation if you know the values
  status: z.enum(['draft', 'published', 'archived'])
});
    `);

    console.log('\n=== Tips for Production Usage ===');
    console.log(`
1. **Caching**: Cache generated schemas to avoid repeated database queries
2. **Error Handling**: Always wrap schema generation in try-catch blocks
3. **Type Safety**: Use TypeScript interfaces alongside Zod schemas
4. **Performance**: Consider generating schemas at build time for large applications
5. **Validation**: Test your schemas with real data during development
6. **Documentation**: Document any custom type mappings for your team
    `);

  } catch (error) {
    console.error('Error in advanced examples:', error.message);
  }
}

// Example SQL schema for reference
const exampleAdvancedSchema = `
-- Advanced PostgreSQL Schema Example

-- Custom enum types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');

-- Table with range types
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  duration INT4RANGE,
  date_range TSTZRANGE NOT NULL,
  price_range NUMRANGE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table with geometric and network types
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  coordinates POINT,
  coverage_area POLYGON,
  ip_address INET,
  mac_address MACADDR,
  metadata JSONB
);

-- Table with arrays and custom types
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status user_status DEFAULT 'pending',
  priority priority_level DEFAULT 'medium',
  tags TEXT[],
  contributor_ids INTEGER[],
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
`;

module.exports = { 
  advancedExamples, 
  exampleAdvancedSchema 
};

// Run examples if called directly
if (require.main === module) {
  advancedExamples().catch(console.error);
}
