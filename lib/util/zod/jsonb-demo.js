// Simple JSONB Type Safety Demo for Knex Zod Integration
// This file demonstrates the new JSONB type safety features

const { getCommonJsonbPatterns } = require('./createSelectSchema');

function demonstrateJsonbPatterns() {
  console.log('🚀 JSONB Type Safety Examples for Knex Zod Integration\n');
  
  console.log('=== Available JSONB Patterns ===');
  
  const patterns = getCommonJsonbPatterns();
  
  console.log('\n1. Basic Patterns:');
  console.log('   record():', patterns.record());
  console.log('   stringRecord():', patterns.stringRecord());
  console.log('   stringArray():', patterns.stringArray());
  console.log('   numberArray():', patterns.numberArray());
  console.log('   tags():', patterns.tags());
  
  console.log('\n2. Advanced Object Patterns:');
  console.log('   userProfile():', patterns.userProfile());
  console.log('\n   settings():', patterns.settings());
  console.log('\n   metadata():', patterns.metadata());
  console.log('\n   address():', patterns.address());
  
  console.log('\n3. Parameterized Patterns:');
  console.log('   record(z.number()):', patterns.record('z.number()'));
  console.log('   objectArray(z.object({ id: z.string() })):', 
    patterns.objectArray('z.object({ id: z.string() })'));
  
  console.log('\n=== Usage Examples ===');
  
  console.log('\n1. Using jsonbPatterns option:');
  console.log(`
  const schema = await createSelectSchema(knex, 'users', {
    jsonbPatterns: {
      profile: 'userProfile',
      settings: 'settings',
      metadata: 'metadata',
      tags: 'tags'
    }
  });
  `);
  
  console.log('\n2. Using custom jsonbSchemas option:');
  console.log(`
  const schema = await createSelectSchema(knex, 'products', {
    jsonbSchemas: {
      config: \`z.object({
        dimensions: z.object({
          width: z.number().positive(),
          height: z.number().positive(),
          depth: z.number().positive()
        }),
        weight: z.number().positive(),
        color: z.enum(['red', 'blue', 'green']),
        features: z.array(z.string())
      })\`,
      analytics: \`z.object({
        pageViews: z.number().int().nonnegative(),
        uniqueVisitors: z.number().int().nonnegative(),
        bounceRate: z.number().min(0).max(1)
      })\`
    }
  });
  `);
  
  console.log('\n3. Priority System:');
  console.log(`
  // jsonbSchemas take priority over jsonbPatterns
  const schema = await createSelectSchema(knex, 'users', {
    jsonbSchemas: {
      profile: 'z.string()' // Custom schema takes priority
    },
    jsonbPatterns: {
      profile: 'userProfile' // This will be ignored
    }
  });
  `);
  
  console.log('\n=== Benefits ===');
  console.log('✅ Type-safe JSONB fields with precise validation');
  console.log('✅ Reusable patterns for common use cases');
  console.log('✅ Custom schemas for specific business logic');
  console.log('✅ Runtime validation with TypeScript inference');
  console.log('✅ API request/response validation');
  console.log('✅ Database query result validation');
  
  console.log('\n=== Integration Example ===');
  console.log(`
  // In your API route
  const UserCreateSchema = await createSelectSchemaObject(knex, 'users', z, {
    exclude: ['id', 'created_at', 'updated_at'],
    jsonbPatterns: {
      profile: 'userProfile',
      settings: 'settings'
    }
  });
  
  // Validate API request
  const validation = UserCreateSchema.safeParse(req.body);
  if (validation.success) {
    // Insert validated data
    const [userId] = await knex('users')
      .insert(validation.data)
      .returning('id');
  }
  `);
  
  console.log('\n✨ Enhanced JSONB type safety is now available!');
}

// Export for use in other files
module.exports = {
  demonstrateJsonbPatterns
};

// Run if called directly
if (require.main === module) {
  demonstrateJsonbPatterns();
}
