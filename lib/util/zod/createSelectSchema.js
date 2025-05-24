// Zod Schema Generator for Knex Table Definitions
// Creates Zod validation schemas from PostgreSQL table column info
// -------

/**
 * Maps PostgreSQL data types to appropriate Zod schema types
 * @param {string} pgType - PostgreSQL data type
 * @param {object} columnInfo - Column metadata from columnInfo()
 * @returns {string} - Zod schema method call
 */
function mapPgTypeToZod(pgType, columnInfo) {
  const { maxLength, nullable, defaultValue } = columnInfo;
  
  // Normalize type name (remove precision/scale info)
  const baseType = pgType.toLowerCase().split('(')[0].trim();
  
  let zodSchema;
  
  switch (baseType) {
    // String types
    case 'character varying':
    case 'varchar':
    case 'character':
    case 'char':
    case 'text':
      zodSchema = 'z.string()';
      if (maxLength && maxLength > 0) {
        zodSchema = `z.string().max(${maxLength})`;
      }
      break;
      
    // Numeric types
    case 'integer':
    case 'int':
    case 'int4':
    case 'smallint':
    case 'int2':
    case 'bigint':
    case 'int8':
    case 'serial':
    case 'bigserial':
      zodSchema = 'z.number().int()';
      break;
      
    case 'real':
    case 'float4':
    case 'double precision':
    case 'float8':
    case 'numeric':
    case 'decimal':
      zodSchema = 'z.number()';
      // Note: Zod doesn't have built-in precision validation for numbers
      // For strict decimal validation, consider using z.string() with regex
      break;
      
    // Boolean
    case 'boolean':
    case 'bool':
      zodSchema = 'z.boolean()';
      break;
      
    // Date/Time types
    case 'date':
      zodSchema = 'z.string().date()';
      break;
      
    case 'timestamp':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
    case 'timestamptz':
      zodSchema = 'z.string().datetime()';
      break;
      
    case 'time':
    case 'time without time zone':
    case 'time with time zone':
    case 'timetz':
      zodSchema = 'z.string().time()';
      break;
      
    // JSON types
    case 'json':
    case 'jsonb':
      zodSchema = 'z.unknown()'; // Could be z.record() or z.array() depending on use case
      break;
      
    // UUID
    case 'uuid':
      zodSchema = 'z.string().uuid()';
      break;
      
    // Binary data
    case 'bytea':
      zodSchema = 'z.instanceof(Buffer)';
      break;
      
    // Arrays (PostgreSQL array notation)
    case 'text[]':
    case 'varchar[]':
    case 'integer[]':
    case 'bigint[]':
      const arrayBaseType = baseType.replace('[]', '');
      const elementSchema = mapPgTypeToZod(arrayBaseType, { ...columnInfo, maxLength: null });
      zodSchema = `z.array(${elementSchema})`;
      break;
      
    // Geometric types
    case 'point':
    case 'line':
    case 'lseg':
    case 'box':
    case 'path':
    case 'polygon':
    case 'circle':
      zodSchema = 'z.string()'; // Geometric types are often represented as strings
      break;
      
    // Network address types
    case 'cidr':
    case 'inet':
    case 'macaddr':
    case 'macaddr8':
      zodSchema = 'z.string()';
      break;
      
    // Bit string types
    case 'bit':
    case 'bit varying':
    case 'varbit':
      zodSchema = 'z.string()';
      break;
      
    // Money
    case 'money':
      zodSchema = 'z.string()'; // Money is often handled as string to avoid floating point issues
      break;
      
    // Range types (PostgreSQL 9.2+)
    case 'int4range':
    case 'int8range':
    case 'numrange':
    case 'tsrange':
    case 'tstzrange':
    case 'daterange':
      zodSchema = 'z.string()'; // Range types are typically handled as strings
      break;
      
    // Enum types (custom user-defined types)
    default:
      // Check if it's likely a custom enum type
      if (baseType.match(/^[a-z_][a-z0-9_]*$/)) {
        zodSchema = 'z.string()'; // Treat custom enums as strings
        // TODO: In the future, we could enhance this to detect actual enum values
        // and create z.enum(['value1', 'value2']) schemas
      } else {
        zodSchema = 'z.unknown()'; // Fallback for unknown types
      }
  }
  
  // Handle nullable columns
  if (nullable) {
    zodSchema += '.nullable()';
  }
  
  // Handle default values
  if (defaultValue !== null && defaultValue !== undefined) {
    // Clean up PostgreSQL default value syntax
    let cleanDefault = String(defaultValue);
    
    // Remove PostgreSQL casting syntax like ::text, ::integer
    cleanDefault = cleanDefault.replace(/::[a-zA-Z_][a-zA-Z0-9_]*(\[\])?/g, '');
    
    // Handle string defaults (remove quotes)
    if (cleanDefault.startsWith("'") && cleanDefault.endsWith("'")) {
      cleanDefault = cleanDefault.slice(1, -1);
      zodSchema += `.default("${cleanDefault}")`;
    }
    // Handle numeric defaults
    else if (!isNaN(cleanDefault) && cleanDefault !== '') {
      zodSchema += `.default(${cleanDefault})`;
    }
    // Handle boolean defaults
    else if (cleanDefault === 'true' || cleanDefault === 'false') {
      zodSchema += `.default(${cleanDefault})`;
    }
    // Handle special PostgreSQL defaults
    else if (cleanDefault.includes('now()') || cleanDefault.includes('CURRENT_TIMESTAMP')) {
      // Don't add default for timestamp functions - they're handled by the database
    }
    else if (cleanDefault.includes('nextval(')) {
      // Don't add default for sequence values - they're handled by the database
    }
    else {
      // For other complex defaults, add as string
      zodSchema += `.default("${cleanDefault}")`;
    }
  }
  
  return zodSchema;
}

/**
 * Gets enum values for a given enum type in PostgreSQL
 * @param {object} knex - Knex instance
 * @param {string} enumType - Name of the enum type
 * @returns {Promise<string[]>} - Array of enum values
 */
async function getEnumValues(knex, enumType) {
  try {
    const result = await knex.raw(`
      SELECT unnest(enum_range(NULL::${enumType})) as enum_value
    `);
    return result.rows ? result.rows.map(row => row.enum_value) : [];
  } catch (error) {
    // If enum doesn't exist or other error, return empty array
    return [];
  }
}

/**
 * Creates a Zod schema object from Knex table column information
 * @param {object} knex - Knex instance
 * @param {string} tableName - Name of the table
 * @param {object} options - Configuration options
 * @param {string[]} options.columns - Specific columns to include (optional)
 * @param {string[]} options.exclude - Columns to exclude (optional)
 * @param {boolean} options.strict - Whether to use strict mode (default: true)
 * @returns {Promise<string>} - Generated Zod schema code as string
 */
async function createSelectSchema(knex, tableName, options = {}) {
  const { columns, exclude = [], strict = true } = options;
  
  // Validate that we're using PostgreSQL
  if (!knex.client.config.client.includes('pg')) {
    throw new Error('createSelectSchema currently only supports PostgreSQL');
  }
  
  try {
    // Get column information from the database
    const columnInfo = await knex(tableName).columnInfo();
    
    if (!columnInfo || Object.keys(columnInfo).length === 0) {
      throw new Error(`Table "${tableName}" not found or has no columns`);
    }
    
    // Filter columns based on options
    let columnsToProcess = Object.keys(columnInfo);
    
    if (columns && columns.length > 0) {
      columnsToProcess = columnsToProcess.filter(col => columns.includes(col));
    }
    
    if (exclude.length > 0) {
      columnsToProcess = columnsToProcess.filter(col => !exclude.includes(col));
    }
    
    // Generate Zod schema properties
    const schemaProperties = [];
    
    for (const columnName of columnsToProcess) {
      const column = columnInfo[columnName];
      const zodType = mapPgTypeToZod(column.type, column);
      schemaProperties.push(`  ${columnName}: ${zodType}`);
    }
    
    // Build the complete schema
    const schemaMode = strict ? 'strict' : 'passthrough';
    const schemaCode = `z.object({
${schemaProperties.join(',\n')}
}).${schemaMode}()`;
    
    return schemaCode;
    
  } catch (error) {
    throw new Error(`Failed to create schema for table "${tableName}": ${error.message}`);
  }
}

/**
 * Creates a Zod schema object and returns it as a JavaScript object (not string)
 * Requires Zod to be imported in the calling code
 * @param {object} knex - Knex instance  
 * @param {string} tableName - Name of the table
 * @param {object} z - Zod instance
 * @param {object} options - Configuration options
 * @returns {Promise<object>} - Actual Zod schema object
 */
async function createSelectSchemaObject(knex, tableName, z, options = {}) {
  if (!z || typeof z.object !== 'function') {
    throw new Error('Valid Zod instance must be provided as third parameter');
  }
  
  const schemaCode = await createSelectSchema(knex, tableName, options);
  
  // This is a bit hacky, but we need to evaluate the generated code
  // In a real implementation, you might want to build the schema object directly
  try {
    // Create a function that returns the schema
    const schemaFunction = new Function('z', `return ${schemaCode}`);
    return schemaFunction(z);
  } catch (error) {
    throw new Error(`Failed to create Zod schema object: ${error.message}`);
  }
}

module.exports = {
  createSelectSchema,
  createSelectSchemaObject,
  mapPgTypeToZod,
  getEnumValues
};
