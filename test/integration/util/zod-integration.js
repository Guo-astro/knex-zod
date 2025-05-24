const { expect } = require('chai');
const { createSelectSchema, createSelectSchemaObject } = require('../../../lib/util/zod/createSelectSchema');

// Test only runs for PostgreSQL
module.exports = function (knex) {
  // Skip tests if not PostgreSQL
  if (!knex.client.config.client.includes('pg')) {
    return;
  }

  describe('Zod Schema Generator Integration Tests (PostgreSQL)', function () {
    beforeEach(async function () {
      // Create test table with various PostgreSQL types
      await knex.schema.dropTableIfExists('zod_test_table');
      await knex.schema.createTable('zod_test_table', function (table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('email').nullable();
        table.boolean('is_active').defaultTo(true);
        table.integer('age').nullable();
        table.decimal('salary', 10, 2).nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.date('birth_date').nullable();
        table.uuid('external_id').nullable();
        table.json('metadata').nullable();
        table.specificType('tags', 'text[]').nullable();
        table.text('description').nullable();
      });
    });

    afterEach(async function () {
      await knex.schema.dropTableIfExists('zod_test_table');
    });

    describe('createSelectSchema', function () {
      it('should generate valid Zod schema for test table', async function () {
        const schema = await createSelectSchema(knex, 'zod_test_table');
        
        expect(schema).to.be.a('string');
        expect(schema).to.include('z.object({');
        expect(schema).to.include('}).strict()');
        
        // Check for basic field mappings
        expect(schema).to.include('id: z.number().int()');
        expect(schema).to.include('name: z.string().max(255)');
        expect(schema).to.include('email: z.string().nullable()');
        expect(schema).to.include('is_active: z.boolean().default(true)');
        expect(schema).to.include('age: z.number().int().nullable()');
        expect(schema).to.include('salary: z.number().nullable()');
        expect(schema).to.include('created_at: z.string().datetime()');
        expect(schema).to.include('birth_date: z.string().date().nullable()');
        expect(schema).to.include('external_id: z.string().uuid().nullable()');
        expect(schema).to.include('metadata: z.unknown().nullable()');
        expect(schema).to.include('description: z.string().nullable()');
      });

      it('should handle column filtering correctly', async function () {
        const schema = await createSelectSchema(knex, 'zod_test_table', {
          columns: ['id', 'name', 'email']
        });
        
        expect(schema).to.include('id: z.number().int()');
        expect(schema).to.include('name: z.string().max(255)');
        expect(schema).to.include('email: z.string().nullable()');
        expect(schema).to.not.include('is_active');
        expect(schema).to.not.include('metadata');
      });

      it('should handle column exclusion correctly', async function () {
        const schema = await createSelectSchema(knex, 'zod_test_table', {
          exclude: ['metadata', 'description']
        });
        
        expect(schema).to.include('id: z.number().int()');
        expect(schema).to.include('name: z.string().max(255)');
        expect(schema).to.not.include('metadata');
        expect(schema).to.not.include('description');
      });

      it('should handle strict vs passthrough mode', async function () {
        const strictSchema = await createSelectSchema(knex, 'zod_test_table', {
          strict: true
        });
        expect(strictSchema).to.include('}).strict()');

        const passthroughSchema = await createSelectSchema(knex, 'zod_test_table', {
          strict: false
        });
        expect(passthroughSchema).to.include('}).passthrough()');
      });

      it('should throw error for non-existent table', async function () {
        try {
          await createSelectSchema(knex, 'non_existent_table');
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Table "non_existent_table" not found');
        }
      });
    });

    describe('createSelectSchemaObject', function () {
      it('should create functional Zod schema object', async function () {
        // Mock Zod for testing (in real usage, import actual zod)
        const mockZ = createMockZod();
        
        const schemaObject = await createSelectSchemaObject(knex, 'zod_test_table', mockZ);
        
        expect(schemaObject).to.be.an('object');
        expect(schemaObject._type).to.equal('object');
        expect(schemaObject._mode).to.equal('strict');
      });

      it('should throw error when Zod instance is not provided', async function () {
        try {
          await createSelectSchemaObject(knex, 'zod_test_table', null);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.equal('Valid Zod instance must be provided as third parameter');
        }
      });
    });

    describe('Real columnInfo integration', function () {
      it('should correctly read actual PostgreSQL column information', async function () {
        const columnInfo = await knex('zod_test_table').columnInfo();
        
        expect(columnInfo).to.be.an('object');
        expect(columnInfo.id).to.exist;
        expect(columnInfo.name).to.exist;
        expect(columnInfo.email).to.exist;
        
        // Verify column types are detected correctly
        expect(columnInfo.id.type).to.include('int');
        expect(columnInfo.name.type).to.include('varchar');
        expect(columnInfo.is_active.type).to.include('bool');
        
        // Test with the actual column info
        const schema = await createSelectSchema(knex, 'zod_test_table');
        expect(schema).to.be.a('string');
        expect(schema.length).to.be.greaterThan(100); // Should be a substantial schema
      });
    });
  });
};

// Helper function to create a mock Zod instance for testing
function createMockZod() {
  const createChainableMock = (type, options = {}) => ({
    _type: type,
    ...options,
    nullable: () => createChainableMock(type, { ...options, _nullable: true }),
    default: (val) => createChainableMock(type, { ...options, _default: val }),
    max: (val) => createChainableMock(type, { ...options, _max: val }),
    int: () => createChainableMock(type, { ...options, _format: 'int' }),
    uuid: () => createChainableMock(type, { ...options, _format: 'uuid' }),
    date: () => createChainableMock(type, { ...options, _format: 'date' }),
    datetime: () => createChainableMock(type, { ...options, _format: 'datetime' }),
    time: () => createChainableMock(type, { ...options, _format: 'time' })
  });

  return {
    object: (schema) => ({
      _type: 'object',
      _schema: schema,
      strict: () => ({ _type: 'object', _schema: schema, _mode: 'strict' }),
      passthrough: () => ({ _type: 'object', _schema: schema, _mode: 'passthrough' })
    }),
    string: () => createChainableMock('string'),
    number: () => createChainableMock('number'),
    boolean: () => createChainableMock('boolean'),
    unknown: () => createChainableMock('unknown'),
    instanceof: (cls) => createChainableMock('instanceof', { _class: cls }),
    array: (schema) => createChainableMock('array', { _items: schema })
  };
}
