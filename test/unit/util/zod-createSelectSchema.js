const { expect } = require('chai');
const { mapPgTypeToZod, createSelectSchema, createSelectSchemaObject } = require('../../../lib/util/zod/createSelectSchema');

describe('Zod Schema Generator', () => {
  describe('mapPgTypeToZod', () => {
    it('should map string types correctly', () => {
      expect(mapPgTypeToZod('varchar', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('text', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('character varying(255)', { nullable: false, maxLength: 255 })).to.equal('z.string().max(255)');
    });

    it('should map numeric types correctly', () => {
      expect(mapPgTypeToZod('integer', { nullable: false })).to.equal('z.number().int()');
      expect(mapPgTypeToZod('bigint', { nullable: false })).to.equal('z.number().int()');
      expect(mapPgTypeToZod('real', { nullable: false })).to.equal('z.number()');
      expect(mapPgTypeToZod('numeric', { nullable: false })).to.equal('z.number()');
    });

    it('should map boolean types correctly', () => {
      expect(mapPgTypeToZod('boolean', { nullable: false })).to.equal('z.boolean()');
      expect(mapPgTypeToZod('bool', { nullable: false })).to.equal('z.boolean()');
    });

    it('should map date/time types correctly', () => {
      expect(mapPgTypeToZod('date', { nullable: false })).to.equal('z.string().date()');
      expect(mapPgTypeToZod('timestamp', { nullable: false })).to.equal('z.string().datetime()');
      expect(mapPgTypeToZod('timestamptz', { nullable: false })).to.equal('z.string().datetime()');
      expect(mapPgTypeToZod('time', { nullable: false })).to.equal('z.string().time()');
    });

    it('should map JSON types correctly', () => {
      expect(mapPgTypeToZod('json', { nullable: false })).to.equal('z.unknown()');
      expect(mapPgTypeToZod('jsonb', { nullable: false })).to.equal('z.unknown()');
    });

    it('should map UUID correctly', () => {
      expect(mapPgTypeToZod('uuid', { nullable: false })).to.equal('z.string().uuid()');
    });

    it('should map binary data correctly', () => {
      expect(mapPgTypeToZod('bytea', { nullable: false })).to.equal('z.instanceof(Buffer)');
    });

    it('should map array types correctly', () => {
      expect(mapPgTypeToZod('text[]', { nullable: false })).to.equal('z.array(z.string())');
      expect(mapPgTypeToZod('integer[]', { nullable: false })).to.equal('z.array(z.number().int())');
    });

    it('should handle nullable columns', () => {
      expect(mapPgTypeToZod('varchar', { nullable: true })).to.equal('z.string().nullable()');
      expect(mapPgTypeToZod('integer', { nullable: true })).to.equal('z.number().int().nullable()');
    });

    it('should handle default values', () => {
      expect(mapPgTypeToZod('varchar', { nullable: false, defaultValue: "'test'" })).to.equal('z.string().default("test")');
      expect(mapPgTypeToZod('integer', { nullable: false, defaultValue: '42' })).to.equal('z.number().int().default(42)');
      expect(mapPgTypeToZod('boolean', { nullable: false, defaultValue: 'true' })).to.equal('z.boolean().default(true)');
    });

    it('should handle PostgreSQL casting syntax in defaults', () => {
      expect(mapPgTypeToZod('varchar', { nullable: false, defaultValue: "'test'::text" })).to.equal('z.string().default("test")');
      expect(mapPgTypeToZod('integer', { nullable: false, defaultValue: '42::integer' })).to.equal('z.number().int().default(42)');
    });

    it('should handle special PostgreSQL defaults', () => {
      // Should not add default for database functions
      expect(mapPgTypeToZod('timestamp', { nullable: false, defaultValue: 'now()' })).to.equal('z.string().datetime()');
      expect(mapPgTypeToZod('timestamp', { nullable: false, defaultValue: 'CURRENT_TIMESTAMP' })).to.equal('z.string().datetime()');
      expect(mapPgTypeToZod('integer', { nullable: false, defaultValue: "nextval('seq')" })).to.equal('z.number().int()');
    });

    it('should handle unknown types as fallback', () => {
      expect(mapPgTypeToZod('custom_enum_type', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('weird_unknown_type!@#', { nullable: false })).to.equal('z.unknown()');
    });

    it('should handle geometric types', () => {
      expect(mapPgTypeToZod('point', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('polygon', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('circle', { nullable: false })).to.equal('z.string()');
    });

    it('should handle network address types', () => {
      expect(mapPgTypeToZod('inet', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('cidr', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('macaddr', { nullable: false })).to.equal('z.string()');
    });

    it('should handle money type', () => {
      expect(mapPgTypeToZod('money', { nullable: false })).to.equal('z.string()');
    });

    it('should handle range types', () => {
      expect(mapPgTypeToZod('int4range', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('tsrange', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('numrange', { nullable: false })).to.equal('z.string()');
      expect(mapPgTypeToZod('daterange', { nullable: false })).to.equal('z.string()');
    });
  });

  describe('createSelectSchema', () => {
    let mockKnex;
    
    beforeEach(() => {
      mockKnex = {
        client: {
          config: {
            client: 'pg'
          }
        }
      };
    });

    it('should throw error for non-PostgreSQL clients', async () => {
      mockKnex.client.config.client = 'mysql';
      
      try {
        await createSelectSchema(mockKnex, 'users');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('createSelectSchema currently only supports PostgreSQL');
      }
    });

    it('should generate basic schema for simple table', async () => {
      const mockColumnInfo = {
        id: { type: 'integer', nullable: false },
        name: { type: 'varchar', nullable: false, maxLength: 255 },
        email: { type: 'varchar', nullable: true, maxLength: 255 },
        created_at: { type: 'timestamp', nullable: false }
      };

      mockKnex = Object.assign((tableName) => ({
        columnInfo: () => Promise.resolve(mockColumnInfo)
      }), {
        client: {
          config: {
            client: 'pg'
          }
        }
      });

      const schema = await createSelectSchema(mockKnex, 'users');
      
      expect(schema).to.be.a('string');
      expect(schema).to.include('z.object({');
      expect(schema).to.include('id: z.number().int()');
      expect(schema).to.include('name: z.string().max(255)');
      expect(schema).to.include('email: z.string().max(255).nullable()');
      expect(schema).to.include('created_at: z.string().datetime()');
      expect(schema).to.include('}).strict()');
    });

    it('should handle column filtering', async () => {
      const mockColumnInfo = {
        id: { type: 'integer', nullable: false },
        name: { type: 'varchar', nullable: false },
        email: { type: 'varchar', nullable: true },
        password: { type: 'varchar', nullable: false }
      };

      mockKnex = Object.assign((tableName) => ({
        columnInfo: () => Promise.resolve(mockColumnInfo)
      }), {
        client: {
          config: {
            client: 'pg'
          }
        }
      });

      const schema = await createSelectSchema(mockKnex, 'users', {
        columns: ['id', 'name', 'email']
      });
      
      expect(schema).to.include('id: z.number().int()');
      expect(schema).to.include('name: z.string()');
      expect(schema).to.include('email: z.string().nullable()');
      expect(schema).to.not.include('password');
    });

    it('should handle column exclusion', async () => {
      const mockColumnInfo = {
        id: { type: 'integer', nullable: false },
        name: { type: 'varchar', nullable: false },
        email: { type: 'varchar', nullable: true },
        password: { type: 'varchar', nullable: false }
      };

      mockKnex = Object.assign((tableName) => ({
        columnInfo: () => Promise.resolve(mockColumnInfo)
      }), {
        client: {
          config: {
            client: 'pg'
          }
        }
      });

      const schema = await createSelectSchema(mockKnex, 'users', {
        exclude: ['password']
      });
      
      expect(schema).to.include('id: z.number().int()');
      expect(schema).to.include('name: z.string()');
      expect(schema).to.include('email: z.string().nullable()');
      expect(schema).to.not.include('password');
    });

    it('should handle strict vs passthrough mode', async () => {
      const mockColumnInfo = {
        id: { type: 'integer', nullable: false },
        name: { type: 'varchar', nullable: false }
      };

      mockKnex = Object.assign((tableName) => ({
        columnInfo: () => Promise.resolve(mockColumnInfo)
      }), {
        client: {
          config: {
            client: 'pg'
          }
        }
      });

      const strictSchema = await createSelectSchema(mockKnex, 'users', { strict: true });
      expect(strictSchema).to.include('}).strict()');

      const passthroughSchema = await createSelectSchema(mockKnex, 'users', { strict: false });
      expect(passthroughSchema).to.include('}).passthrough()');
    });

    it('should throw error for non-existent table', async () => {
      mockKnex = Object.assign((tableName) => ({
        columnInfo: () => Promise.resolve({})
      }), {
        client: {
          config: {
            client: 'pg'
          }
        }
      });

      try {
        await createSelectSchema(mockKnex, 'nonexistent');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Table "nonexistent" not found or has no columns');
      }
    });
  });

  describe('createSelectSchemaObject', () => {
    let mockKnex;
    let mockZ;
    
    beforeEach(() => {
      mockKnex = {
        client: {
          config: {
            client: 'pg'
          }
        }
      };

      // Mock Zod object
      mockZ = {
        object: (schema) => ({
          strict: () => ({ _schema: schema, _mode: 'strict' }),
          passthrough: () => ({ _schema: schema, _mode: 'passthrough' })
        }),
        string: () => ({
          max: (len) => ({ _type: 'string', _max: len }),
          nullable: () => ({ _type: 'string', _nullable: true }),
          default: (val) => ({ _type: 'string', _default: val }),
          uuid: () => ({ _type: 'string', _format: 'uuid' }),
          date: () => ({ _type: 'string', _format: 'date' }),
          datetime: () => ({ _type: 'string', _format: 'datetime' }),
          time: () => ({ _type: 'string', _format: 'time' })
        }),
        number: () => ({
          int: () => ({
            nullable: () => ({ _type: 'number', _format: 'int', _nullable: true }),
            default: (val) => ({ _type: 'number', _format: 'int', _default: val })
          }),
          nullable: () => ({ _type: 'number', _nullable: true }),
          default: (val) => ({ _type: 'number', _default: val })
        }),
        boolean: () => ({
          nullable: () => ({ _type: 'boolean', _nullable: true }),
          default: (val) => ({ _type: 'boolean', _default: val })
        }),
        unknown: () => ({ _type: 'unknown' }),
        instanceof: (cls) => ({ _type: 'instanceof', _class: cls }),
        array: (schema) => ({ _type: 'array', _items: schema })
      };
    });

    it('should throw error when Zod instance is not provided', async () => {
      mockKnex = (tableName) => ({
        columnInfo: () => Promise.resolve({ id: { type: 'integer', nullable: false } })
      });

      try {
        await createSelectSchemaObject(mockKnex, 'users', null);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Valid Zod instance must be provided as third parameter');
      }
    });

    it('should return a Zod schema object', async () => {
      const mockColumnInfo = {
        id: { type: 'integer', nullable: false },
        name: { type: 'varchar', nullable: false }
      };

      mockKnex = Object.assign((tableName) => ({
        columnInfo: () => Promise.resolve(mockColumnInfo)
      }), {
        client: {
          config: {
            client: 'pg'
          }
        }
      });

      const schemaObject = await createSelectSchemaObject(mockKnex, 'users', mockZ);
      
      expect(schemaObject).to.be.an('object');
      expect(schemaObject._mode).to.equal('strict');
      expect(schemaObject._schema).to.be.an('object');
    });
  });
});
