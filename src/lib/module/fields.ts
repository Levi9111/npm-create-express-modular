/**
 * src/lib/module/fields.ts
 *
 * Parses `--fields` DSL (e.g. "name:string,price:number,inStock:boolean?,category:enum(food|tech),owner:ref(User)")
 * and formats field definitions for TypeScript interfaces, Mongoose, Prisma, Drizzle, Zod, Joi, and OpenAPI.
 */

import { isValidIdentifier } from '../utils/string';

export type BaseFieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'ref';

export interface ParsedField {
  name: string;
  baseType: BaseFieldType;
  isArray: boolean;
  optional: boolean;
  enumValues?: string[];
  refModel?: string;
}

/**
 * Parses a comma-separated `--fields` string into validated `ParsedField[]`.
 */
export function parseFields(raw?: string): ParsedField[] {
  if (!raw || !raw.trim()) return [];

  const tokens = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const fields: ParsedField[] = [];
  for (const token of tokens) {
    const colonIdx = token.indexOf(':');
    if (colonIdx === -1) {
      throw new Error(`Invalid field "${token}". Expected format "name:type" (e.g. "price:number").`);
    }

    const name = token.slice(0, colonIdx).trim();
    if (!isValidIdentifier(name)) {
      throw new Error(`Invalid field name "${name}". Use letters, numbers, and underscores, starting with a letter.`);
    }

    let typePart = token.slice(colonIdx + 1).trim();
    if (!typePart) {
      throw new Error(`Missing type for field "${name}".`);
    }

    let optional = false;
    if (typePart.endsWith('?')) {
      optional = true;
      typePart = typePart.slice(0, -1).trim();
    }

    let isArray = false;
    if (typePart.endsWith('[]')) {
      isArray = true;
      typePart = typePart.slice(0, -2).trim();
    }

    const enumMatch = typePart.match(/^enum\(([^)]+)\)$/i);
    if (enumMatch) {
      const enumValues = enumMatch[1]
        .split('|')
        .map((v) => v.trim())
        .filter(Boolean);
      if (enumValues.length === 0) {
        throw new Error(`Enum field "${name}" must specify at least one value, e.g. enum(a|b).`);
      }
      for (const val of enumValues) {
        if (!/^[A-Za-z0-9_-]+$/.test(val)) {
          throw new Error(
            `Invalid enum value "${val}" on field "${name}". Use only letters, numbers, underscores, or hyphens.`,
          );
        }
      }
      fields.push({ name, baseType: 'enum', isArray, optional, enumValues });
      continue;
    }

    const refMatch = typePart.match(/^ref\(([^)]+)\)$/i);
    if (refMatch) {
      const refModel = refMatch[1].trim();
      if (!isValidIdentifier(refModel)) {
        throw new Error(`Invalid ref model "${refModel}" on field "${name}".`);
      }
      fields.push({ name, baseType: 'ref', isArray, optional, refModel });
      continue;
    }

    const normalized = typePart.toLowerCase();
    if (normalized === 'string' || normalized === 'number' || normalized === 'boolean' || normalized === 'date') {
      fields.push({ name, baseType: normalized, isArray, optional });
      continue;
    }
    if (normalized === 'bool') {
      fields.push({ name, baseType: 'boolean', isArray, optional });
      continue;
    }

    throw new Error(
      `Unsupported type "${typePart}" on field "${name}". Supported: string, number, boolean, date, enum(a|b), ref(Model), with optional [] and ?.`,
    );
  }

  return fields;
}

export function tsFieldType(f: ParsedField, isMongoose: boolean): string {
  let base: string;
  switch (f.baseType) {
    case 'string':
      base = 'string';
      break;
    case 'number':
      base = 'number';
      break;
    case 'boolean':
      base = 'boolean';
      break;
    case 'date':
      base = 'Date';
      break;
    case 'enum':
      base = (f.enumValues ?? []).map((v) => `'${v}'`).join(' | ');
      break;
    case 'ref':
      base = isMongoose ? 'Types.ObjectId' : 'string';
      break;
  }
  return f.isArray ? `${base}[]` : base;
}

export function mongooseFieldDef(f: ParsedField): string {
  const req = f.optional ? '' : ', required: true';
  let inner: string;
  switch (f.baseType) {
    case 'string':
      inner = `{ type: String${req}, trim: true }`;
      break;
    case 'number':
      inner = `{ type: Number${req} }`;
      break;
    case 'boolean':
      inner = `{ type: Boolean${req} }`;
      break;
    case 'date':
      inner = `{ type: Date${req} }`;
      break;
    case 'enum': {
      const vals = (f.enumValues ?? []).map((v) => `'${v}'`).join(', ');
      inner = `{ type: String, enum: [${vals}]${req} }`;
      break;
    }
    case 'ref':
      inner = `{ type: Schema.Types.ObjectId, ref: '${f.refModel}'${req} }`;
      break;
  }
  return f.isArray ? `[${inner}]` : inner;
}

export function zodFieldDef(f: ParsedField, allOptional = false): string {
  let expr: string;
  switch (f.baseType) {
    case 'string':
    case 'ref':
      expr = f.optional || allOptional ? 'z.string()' : `z.string().min(1, '${f.name} is required')`;
      break;
    case 'number':
      expr = 'z.number()';
      break;
    case 'boolean':
      expr = 'z.boolean()';
      break;
    case 'date':
      expr = 'z.coerce.date()';
      break;
    case 'enum': {
      const vals = (f.enumValues ?? []).map((v) => `'${v}'`).join(', ');
      expr = `z.enum([${vals}])`;
      break;
    }
  }
  if (f.isArray) {
    expr = `z.array(${expr})`;
  }
  if (f.optional || allOptional) {
    expr = `${expr}.optional()`;
  }
  return expr;
}

export function joiFieldDef(f: ParsedField, allOptional = false): string {
  let expr: string;
  switch (f.baseType) {
    case 'string':
    case 'ref':
      expr = 'Joi.string()';
      break;
    case 'number':
      expr = 'Joi.number()';
      break;
    case 'boolean':
      expr = 'Joi.boolean()';
      break;
    case 'date':
      expr = 'Joi.date()';
      break;
    case 'enum': {
      const vals = (f.enumValues ?? []).map((v) => `'${v}'`).join(', ');
      expr = `Joi.string().valid(${vals})`;
      break;
    }
  }
  if (f.isArray) {
    expr = `Joi.array().items(${expr})`;
  }
  if (!f.optional && !allOptional) {
    expr = `${expr}.required()`;
  } else {
    expr = `${expr}.optional()`;
  }
  return expr;
}

export function searchableFieldNames(fields: ParsedField[]): string[] {
  return fields
    .filter((f) => !f.isArray && (f.baseType === 'string' || f.baseType === 'enum'))
    .map((f) => f.name);
}

export function prismaModelBlock(moduleName: string, fields: ParsedField[]): string {
  const lines = fields.map((f) => {
    let pType: string;
    switch (f.baseType) {
      case 'string':
      case 'enum':
      case 'ref':
        pType = 'String';
        break;
      case 'number':
        pType = 'Float';
        break;
      case 'boolean':
        pType = 'Boolean';
        break;
      case 'date':
        pType = 'DateTime';
        break;
    }
    if (f.isArray) pType += '[]';
    else if (f.optional) pType += '?';
    return `  ${f.name.padEnd(10)} ${pType}`;
  });
  return [
    `model ${moduleName} {`,
    '  id        String   @id @default(cuid())',
    ...lines,
    '  createdAt DateTime @default(now())',
    '  updatedAt DateTime @updatedAt',
    '}',
  ].join('\n');
}

export function drizzleTableBlock(tableName: string, fields: ParsedField[]): string {
  const cols = fields.map((f) => {
    let col: string;
    switch (f.baseType) {
      case 'string':
      case 'enum':
      case 'ref':
        col = `text('${f.name}')`;
        break;
      case 'number':
        col = `doublePrecision('${f.name}')`;
        break;
      case 'boolean':
        col = `boolean('${f.name}')`;
        break;
      case 'date':
        col = `timestamp('${f.name}')`;
        break;
    }
    if (f.isArray) col += '.array()';
    if (!f.optional) col += '.notNull()';
    return `  ${f.name}: ${col},`;
  });
  return [
    `export const ${tableName} = pgTable('${tableName}', {`,
    `  id: uuid('id').defaultRandom().primaryKey(),`,
    ...cols,
    `  createdAt: timestamp('created_at').defaultNow().notNull(),`,
    `  updatedAt: timestamp('updated_at').defaultNow().notNull(),`,
    `});`,
  ].join('\n');
}

