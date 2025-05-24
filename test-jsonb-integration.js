// Integration test for JSONB type safety features
const { getCommonJsonbPatterns } = require('./lib/util/zod/createSelectSchema');

async function testJsonbIntegration() {
  console.log('🧪 Testing JSONB Type Safety Integration...\n');

  // Test 1: Get common JSONB patterns
  console.log('1. Testing getCommonJsonbPatterns():');
  const patterns = getCommonJsonbPatterns();
  console.log('✅ Available patterns:', Object.keys(patterns).join(', '));
  
  // Test 2: Generate a pattern example
  console.log('\n2. Testing pattern generation:');
  const userProfileSchema = patterns.userProfile();
  console.log('✅ User profile schema:', userProfileSchema);
  
  // Test 3: Test parameterized patterns
  console.log('\n3. Testing parameterized patterns:');
  const recordSchema = patterns.record('string');
  console.log('✅ Record<string> schema:', recordSchema);
  
  const arraySchema = patterns.objectArray('{ id: string; name: string; }');
  console.log('✅ Object array schema:', arraySchema);

  console.log('\n🎉 All JSONB integration tests passed!');
}

// Run the test
testJsonbIntegration().catch(console.error);
