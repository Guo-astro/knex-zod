# Knex Zod Schema Generator

A utility to automatically generate Zod validation schemas from PostgreSQL table definitions using Knex.js.

## Overview

This utility provides functions to automatically create TypeScript validation schemas using Zod based on your PostgreSQL database table structure. It reads table column information via Knex's `columnInfo()` method and maps PostgreSQL data types to appropriate Zod validation types.

## Features

- **PostgreSQL Support**: Currently supports PostgreSQL databases
- **Comprehensive Type Mapping**: Maps 25+ PostgreSQL data types to appropriate Zod schemas
- **Nullable Columns**: Automatically handles nullable columns with `.nullable()`
- **Default Values**: Intelligently maps database defaults to Zod defaults
- **Column Filtering**: Include/exclude specific columns
- **Schema Modes**: Support for strict and passthrough modes
- **Array Types**: Support for PostgreSQL array types
- **Special Types**: UUID, JSON, geometric types, network addresses, etc.

## Usage

### Basic Usage

```javascript
const knex = require('knex')({
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'username',
    password: 'password',
    database: 'mydb'
  }
});
const { createSelectSchema } = require('knex/lib/util/zod/createSelectSchema');

// Generate schema code as string
const schemaCode = await createSelectSchema(knex, 'users');
console.log(schemaCode);
```

### With Zod Object

```javascript
const z = require('zod');
const { createSelectSchemaObject } = require('knex/lib/util/zod/createSelectSchema');

// Generate actual Zod schema object
const userSchema = await createSelectSchemaObject(knex, 'users', z);

// Use for validation
const validatedUser = userSchema.parse({
  id: 1,
  name: "John Doe",
  email: "john@example.com"
});
```

### Column Filtering

```javascript
// Include only specific columns
const publicUserSchema = await createSelectSchema(knex, 'users', {
  columns: ['id', 'name', 'email']
});

// Exclude sensitive columns
const safeUserSchema = await createSelectSchema(knex, 'users', {
  exclude: ['password', 'ssn']
});
```

### Schema Modes

```javascript
// Strict mode (default) - only defined properties allowed
const strictSchema = await createSelectSchema(knex, 'users', {
  strict: true
});

// Passthrough mode - allows additional properties
const passthroughSchema = await createSelectSchema(knex, 'users', {
  strict: false
});
```

## Supported PostgreSQL Types

### String Types
- `varchar`, `character varying` → `z.string().max(length)`
- `char`, `character` → `z.string().max(length)`
- `text` → `z.string()`

### Numeric Types
- `integer`, `int`, `int4` → `z.number().int()`
- `smallint`, `int2` → `z.number().int()`
- `bigint`, `int8` → `z.number().int()`
- `serial`, `bigserial` → `z.number().int()`
- `real`, `float4` → `z.number()`
- `double precision`, `float8` → `z.number()`
- `numeric`, `decimal` → `z.number()`

### Boolean
- `boolean`, `bool` → `z.boolean()`

### Date/Time Types
- `date` → `z.string().date()`
- `timestamp`, `timestamptz` → `z.string().datetime()`
- `time`, `timetz` → `z.string().time()`

### Special Types
- `uuid` → `z.string().uuid()`
- `json`, `jsonb` → `z.unknown()`
- `bytea` → `z.instanceof(Buffer)`

### Array Types
- `text[]` → `z.array(z.string())`
- `integer[]` → `z.array(z.number().int())`
- And more...

### Geometric Types
- `point`, `line`, `polygon`, etc. → `z.string()`

### Network Types
- `inet`, `cidr`, `macaddr` → `z.string()`

### Other Types
- `money` → `z.string()`
- Custom enum types → `z.string()`
- Unknown types → `z.unknown()`

### PostgreSQL Range Types

Range types like `int4range`, `int8range`, `numrange`, `tsrange`, `tstzrange`, and `daterange` are mapped to `z.string()` as they're typically handled as string representations in JavaScript.

### User-Defined Types

Custom PostgreSQL types (enums, composite types, etc.) are mapped to `z.string()` by default. This provides basic validation while maintaining flexibility for custom application logic.

```sql
-- Example PostgreSQL enum
CREATE TYPE status_type AS ENUM ('active', 'inactive', 'pending');

-- Generated Zod schema treats it as string
status: z.string().nullable()
```

### Complex Types

For advanced PostgreSQL features like composite types, arrays of custom types, or domain types, the utility falls back to safe defaults:

- Composite types → `z.unknown()`
- Custom domains → Based on underlying type
- Multi-dimensional arrays → `z.unknown()`

## API Reference

### `createSelectSchema(knex, tableName, options?)`

Generates Zod schema code as a string.

**Parameters:**
- `knex` - Knex instance (must be PostgreSQL)
- `tableName` - Name of the database table
- `options` - Configuration options (optional)
  - `columns?: string[]` - Specific columns to include
  - `exclude?: string[]` - Columns to exclude
  - `strict?: boolean` - Use strict mode (default: `true`)

**Returns:** `Promise<string>` - Generated Zod schema code

### `createSelectSchemaObject(knex, tableName, z, options?)`

Generates an actual Zod schema object.

**Parameters:**
- `knex` - Knex instance (must be PostgreSQL)
- `tableName` - Name of the database table
- `z` - Zod instance
- `options` - Same as `createSelectSchema`

**Returns:** `Promise<ZodObject>` - Actual Zod schema object

### `mapPgTypeToZod(pgType, columnInfo)`

Maps a PostgreSQL type to Zod schema code.

**Parameters:**
- `pgType` - PostgreSQL data type string
- `columnInfo` - Column metadata object
  - `maxLength?: number` - Maximum length for strings
  - `nullable?: boolean` - Whether column is nullable
  - `defaultValue?: any` - Default value

**Returns:** `string` - Zod schema method call

## Example Output

For a PostgreSQL table:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  profile JSONB
);
```

The generated schema would be:

```javascript
z.object({
  id: z.number().int(),
  name: z.string().max(255),
  email: z.string().max(255).nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  profile: z.unknown().nullable()
}).strict()
```

## Requirements

- Node.js 16+
- Knex.js
- PostgreSQL database
- Zod (for using `createSelectSchemaObject`)

## Limitations

- Currently only supports PostgreSQL
- Complex PostgreSQL features like composite types, ranges, and custom enums are mapped as strings or unknown
- Database function defaults (like `now()`) are not included in the schema
- Sequence defaults (like `nextval()`) are not included in the schema

## Future Enhancements

- Support for MySQL and SQLite
- Better handling of custom PostgreSQL types
- Support for composite types and arrays of custom types
- Integration with Knex table definitions for build-time schema generation
- More sophisticated handling of constraints and checks
