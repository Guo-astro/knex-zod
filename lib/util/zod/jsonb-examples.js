// JSONB Type Safety Examples for Knex Zod Integration
// This file demonstrates various approaches to making JSONB fields type-safe

let z;
try {
  z = require('zod').z;
} catch (error) {
  console.log('⚠️  Zod is not installed. Some examples will be skipped.');
  console.log('To run all examples, install Zod: npm install zod');
}
const knex = require('../../../index'); // Use local knex
const { createSelectSchema, createSelectSchemaObject, getCommonJsonbPatterns } = require('./createSelectSchema');

// Example 1: Using predefined patterns
async function exampleWithPatterns() {
  console.log('=== Example 1: Using Common JSONB Patterns ===');
  
  const db = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      database: 'myapp',
      user: 'user',
      password: 'password'
    }
  });

  try {
    // Schema for a users table with JSONB columns
    const schemaCode = await createSelectSchema(db, 'users', {
      jsonbPatterns: {
        profile: 'userProfile',     // Uses built-in user profile pattern
        settings: 'settings',       // Uses built-in settings pattern
        metadata: 'metadata',       // Uses built-in metadata pattern
        tags: 'tags'               // Uses built-in tags pattern
      }
    });

    console.log('Generated schema with patterns:');
    console.log(schemaCode);
    
    // The generated schema will have type-safe JSONB fields:
    // profile: z.object({ avatar?: z.string().url().optional(), bio?: z.string().optional(), ... })
    // settings: z.object({ theme?: z.enum(['light', 'dark']).optional(), ... })
    // metadata: z.record(z.union([z.string(), z.number(), z.boolean()]))
    // tags: z.array(z.string())
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

// Example 2: Using custom JSONB schemas
async function exampleWithCustomSchemas() {
  console.log('\n=== Example 2: Using Custom JSONB Schemas ===');
  
  const db = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      database: 'myapp',
      user: 'user',
      password: 'password'
    }
  });

  try {
    // Define custom schemas for specific JSONB columns
    const customSchemas = {
      // Product configuration schema
      config: `z.object({
        dimensions: z.object({
          width: z.number().positive(),
          height: z.number().positive(),
          depth: z.number().positive()
        }),
        weight: z.number().positive(),
        color: z.enum(['red', 'blue', 'green', 'black', 'white']),
        features: z.array(z.string()),
        warranty: z.object({
          duration: z.number().int().min(1).max(10),
          type: z.enum(['limited', 'full', 'extended'])
        })
      })`,
      
      // Order details schema
      order_details: `z.object({
        items: z.array(z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
          discount?: z.number().min(0).max(1).optional()
        })),
        shipping: z.object({
          method: z.enum(['standard', 'express', 'overnight']),
          cost: z.number().nonnegative(),
          trackingNumber?: z.string().optional()
        }),
        billing: z.object({
          subtotal: z.number().positive(),
          tax: z.number().nonnegative(),
          total: z.number().positive()
        })
      })`,
      
      // Analytics data schema
      analytics: `z.object({
        pageViews: z.number().int().nonnegative(),
        uniqueVisitors: z.number().int().nonnegative(),
        bounceRate: z.number().min(0).max(1),
        avgSessionDuration: z.number().positive(),
        topPages: z.array(z.object({
          path: z.string(),
          views: z.number().int().nonnegative()
        })),
        conversionEvents: z.array(z.object({
          event: z.string(),
          timestamp: z.string().datetime(),
          value?: z.number().optional()
        }))
      })`
    };

    const schemaCode = await createSelectSchema(db, 'products', {
      jsonbSchemas: customSchemas
    });

    console.log('Generated schema with custom JSONB schemas:');
    console.log(schemaCode);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

// Example 3: Creating actual Zod schema objects for runtime validation
async function exampleWithRuntimeValidation() {
  console.log('\n=== Example 3: Runtime Validation with Type-Safe JSONB ===');
  
  if (!z) {
    console.log('⚠️  Skipping runtime validation example - Zod not available');
    return;
  }
  
  const db = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      database: 'myapp',
      user: 'user',
      password: 'password'
    }
  });

  try {
    // Create actual Zod schema object
    const UserSchema = await createSelectSchemaObject(db, 'users', z, {
      jsonbPatterns: {
        profile: 'userProfile',
        settings: 'settings'
      },
      jsonbSchemas: {
        // Custom schema for preferences
        preferences: `z.object({
          notifications: z.object({
            email: z.boolean().default(true),
            push: z.boolean().default(false),
            sms: z.boolean().default(false)
          }),
          privacy: z.object({
            profileVisible: z.boolean().default(true),
            showEmail: z.boolean().default(false),
            showActivity: z.boolean().default(true)
          }),
          display: z.object({
            theme: z.enum(['light', 'dark', 'auto']).default('auto'),
            language: z.string().default('en'),
            timezone: z.string().default('UTC')
          })
        })`
      }
    });

    // Now you can use the schema for validation
    const validUserData = {
      id: 123,
      email: 'user@example.com',
      name: 'John Doe',
      profile: {
        avatar: 'https://example.com/avatar.jpg',
        bio: 'Software developer',
        preferences: {
          notifications: true,
          language: 'en'
        }
      },
      settings: {
        theme: 'dark',
        notifications: true
      },
      preferences: {
        notifications: {
          email: true,
          push: false,
          sms: false
        },
        privacy: {
          profileVisible: true,
          showEmail: false
        },
        display: {
          theme: 'dark',
          language: 'en',
          timezone: 'America/New_York'
        }
      }
    };

    // Validate the data
    const result = UserSchema.safeParse(validUserData);
    
    if (result.success) {
      console.log('✅ Validation successful!');
      console.log('Typed data:', result.data);
    } else {
      console.log('❌ Validation failed:');
      console.log(result.error.issues);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

// Example 4: Exploring available JSONB patterns
function exploreJsonbPatterns() {
  console.log('\n=== Example 4: Available JSONB Patterns ===');
  
  const patterns = getCommonJsonbPatterns();
  
  console.log('Available patterns:');
  Object.keys(patterns).forEach(pattern => {
    console.log(`- ${pattern}: ${patterns[pattern]()}`);
  });
  
  // Example of using patterns programmatically
  console.log('\n--- Pattern Examples ---');
  console.log('String record:', patterns.stringRecord());
  console.log('User profile:', patterns.userProfile());
  console.log('Custom record:', patterns.record('z.number()'));
}

// Example 5: API integration with type-safe JSONB
async function exampleApiIntegration() {
  console.log('\n=== Example 5: API Integration with Type-Safe JSONB ===');
  
  if (!z) {
    console.log('⚠️  Skipping API integration example - Zod not available');
    return;
  }
  
  // This would be in your Express.js route or similar
  const db = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      database: 'myapp',
      user: 'user',
      password: 'password'
    }
  });

  try {
    // Create schema for API request validation
    const CreateUserSchema = await createSelectSchemaObject(db, 'users', z, {
      exclude: ['id', 'created_at', 'updated_at'], // Exclude auto-generated fields
      jsonbPatterns: {
        profile: 'userProfile',
        settings: 'settings'
      }
    });

    // Mock API request body
    const requestBody = {
      email: 'newuser@example.com',
      name: 'Jane Smith',
      profile: {
        bio: 'Product manager at tech startup',
        social: {
          twitter: '@janesmith',
          linkedin: 'jane-smith'
        }
      },
      settings: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    };

    // Validate API request
    const validation = CreateUserSchema.safeParse(requestBody);
    
    if (validation.success) {
      console.log('✅ API request valid - proceeding with user creation');
      // Here you would insert into database with validated data
      
      // Example insert (commented out since we don't have real DB)
      // const [userId] = await db('users').insert(validation.data).returning('id');
      // console.log('Created user with ID:', userId);
      
    } else {
      console.log('❌ API request invalid:');
      validation.error.issues.forEach(issue => {
        console.log(`- ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

// Run examples
async function runExamples() {
  console.log('🚀 JSONB Type Safety Examples for Knex Zod Integration\n');
  
  // Note: These examples assume you have a PostgreSQL database set up
  // with appropriate tables. Adjust connection settings as needed.
  
  exploreJsonbPatterns();
  
  // Uncomment these when you have a database connection:
  // await exampleWithPatterns();
  // await exampleWithCustomSchemas();
  // await exampleWithRuntimeValidation();
  // await exampleApiIntegration();
  
  console.log('\n✨ Examples completed!');
  console.log('\nTo run the database examples:');
  console.log('1. Set up a PostgreSQL database');
  console.log('2. Update connection settings in the examples');
  console.log('3. Create tables with JSONB columns');
  console.log('4. Uncomment the database example calls');
}

// Export for use in other files
module.exports = {
  exampleWithPatterns,
  exampleWithCustomSchemas,
  exampleWithRuntimeValidation,
  exploreJsonbPatterns,
  exampleApiIntegration,
  runExamples
};

// Run if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}
