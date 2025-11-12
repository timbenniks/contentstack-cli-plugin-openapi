import type { ContentType } from '@contentstack/management/types/stack/contentType';
import type { GlobalField } from '@contentstack/management/types/stack/globalField';
import type { Schema } from '@contentstack/management/types/stack/contentType';

export interface JSONSchema {
  type?: string;
  format?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  oneOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $ref?: string;
  additionalProperties?: boolean | JSONSchema;
  required?: string[];
  description?: string;
  enum?: unknown[];
  discriminator?: { propertyName: string; mapping?: Record<string, string> };
}

function addDateFormat(field: { uid?: string }, schema: JSONSchema): void {
  if (!field.uid) return;
  const uid = field.uid.toLowerCase();
  if (schema.type === 'string' && !schema.format) {
    if (uid.includes('time') || uid.includes('_at')) schema.format = 'date-time';
    else if (uid.includes('date')) schema.format = 'date';
  }
}

export function mapFieldToSchema(
  field: { data_type: string; uid: string; display_name?: string; [key: string]: unknown },
  contentTypeMap: Map<string, string> = new Map()
): JSONSchema {
  const schema: JSONSchema = field.display_name ? { description: field.display_name } : {};

  switch (field.data_type) {
    case 'text':
    case 'title':
    case 'isodate':
      schema.type = 'string';
      break;
    case 'number':
      schema.type = 'number';
      break;
    case 'boolean':
      schema.type = 'boolean';
      break;
    case 'date':
    case 'datetime':
      schema.type = 'string';
      schema.format = 'date-time';
      break;
    case 'link':
      if ((field.field_metadata as { ref_multiple?: boolean })?.ref_multiple) {
        schema.type = 'array';
        schema.items = { $ref: '#/components/schemas/Asset' };
      } else {
        schema.$ref = '#/components/schemas/Asset';
      }
      break;
    case 'reference': {
      const referenceTo = (field as Schema & { reference_to?: string | string[] }).reference_to;
      if (referenceTo) {
        const refs = Array.isArray(referenceTo) ? referenceTo : [referenceTo];
        if (refs.length === 1) {
          schema.$ref = `#/components/schemas/${contentTypeMap.get(refs[0]) || refs[0]}`;
        } else {
          schema.oneOf = refs.map(ref => ({ $ref: `#/components/schemas/${contentTypeMap.get(ref) || ref}` }));
        }
      }
      if ((field.field_metadata as { ref_multiple?: boolean })?.ref_multiple) {
        const baseSchema = { ...schema };
        schema.type = 'array';
        schema.items = baseSchema;
        delete schema.$ref;
        delete schema.oneOf;
      }
      break;
    }
    case 'group': {
      const groupSchema = (field as Schema & { schema?: Schema[] }).schema;
      if (groupSchema?.length) {
        schema.type = 'object';
        schema.properties = {};
        groupSchema.forEach(subField => {
          schema.properties![subField.uid] = mapFieldToSchema(subField, contentTypeMap);
        });
      }
      break;
    }
    case 'blocks': {
      const blocks = (field as Schema & { blocks?: Array<{ uid: string; schema?: Schema[] }> }).blocks;
      if (blocks?.length) {
        schema.type = 'array';
        schema.items = {
          oneOf: blocks.map(block => {
            const blockSchema: JSONSchema = {
              type: 'object',
              properties: { _content_type_uid: { type: 'string', enum: [block.uid] } },
            };
            if (block.schema?.length) {
              block.schema.forEach(subField => {
                blockSchema.properties![subField.uid] = mapFieldToSchema(subField, contentTypeMap);
              });
            }
            return blockSchema;
          }),
          discriminator: { propertyName: '_content_type_uid' },
        };
      }
      break;
    }
    case 'json':
      schema.type = 'object';
      schema.additionalProperties = true;
      break;
    case 'markdown':
    case 'text':
      schema.type = 'string';
      break;
    default:
      schema.type = 'object';
      schema.additionalProperties = true;
  }

  if ((field as Schema & { multiple?: boolean }).multiple && schema.$ref && field.data_type !== 'blocks') {
    const baseSchema = { ...schema };
    schema.type = 'array';
    schema.items = baseSchema;
    delete schema.$ref;
  }

  addDateFormat(field, schema);
  return schema;
}

export function getSchemaName(uid: string): string {
  return uid.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function promoteBlockSchemas(fieldSchema: JSONSchema, fieldName: string, parentSchemaName: string, blockSchemas: Record<string, JSONSchema>): JSONSchema {
  if (!fieldSchema.items?.oneOf?.length) return fieldSchema;

  const promotedOneOf = fieldSchema.items.oneOf.map(blockSchema => {
    const blockType = blockSchema.properties?._content_type_uid?.enum?.[0] as string | undefined;
    if (!blockType) return blockSchema;

    const blockSchemaName = `${parentSchemaName}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}${blockType.charAt(0).toUpperCase() + blockType.slice(1)}Block`;
    if (!blockSchemas[blockSchemaName]) blockSchemas[blockSchemaName] = blockSchema;
    return { $ref: `#/components/schemas/${blockSchemaName}` };
  });

  return {
    ...fieldSchema,
    items: { ...fieldSchema.items, oneOf: promotedOneOf, discriminator: fieldSchema.items.discriminator },
  };
}

function buildSchemaFromFields(fields: Schema[], contentTypeMap: Map<string, string>, blockSchemas: Record<string, JSONSchema>, parentSchemaName: string): JSONSchema {
  const schema: JSONSchema = { type: 'object', properties: {}, required: [] };
  fields.forEach(field => {
    const fieldSchema = promoteBlockSchemas(mapFieldToSchema(field, contentTypeMap), field.uid, parentSchemaName, blockSchemas);
    schema.properties![field.uid] = fieldSchema;
    if (field.mandatory) schema.required!.push(field.uid);
  });
  return schema;
}

export function buildContentTypeSchemas(contentTypes: ContentType[], globalFields: GlobalField[] = []): Record<string, JSONSchema> {
  const schemas: Record<string, JSONSchema> = {};
  const blockSchemas: Record<string, JSONSchema> = {};
  const contentTypeMap = new Map(contentTypes.map(ct => [ct.uid, getSchemaName(ct.uid)]));

  globalFields.forEach(gf => {
    const fields = (gf as GlobalField & { schema?: Schema[] }).schema;
    if (fields?.length) {
      const schemaName = `GlobalField_${getSchemaName(gf.uid)}`;
      schemas[schemaName] = buildSchemaFromFields(fields, contentTypeMap, blockSchemas, schemaName);
    }
  });

  contentTypes.forEach(ct => {
    const fields = (ct as ContentType & { schema?: Schema[] }).schema;
    if (fields?.length) {
      const schemaName = getSchemaName(ct.uid);
      schemas[schemaName] = buildSchemaFromFields(fields, contentTypeMap, blockSchemas, schemaName);
    }
  });

  Object.assign(schemas, blockSchemas);

  schemas.EntryMeta = {
    type: 'object',
    properties: {
      uid: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      created_by: { type: 'string' },
      updated_by: { type: 'string' },
      _version: { type: 'number' },
      _in_progress: { type: 'boolean' },
    },
  };

  schemas.Asset = {
    type: 'object',
    properties: {
      uid: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
      created_by: { type: 'string' },
      updated_by: { type: 'string' },
      content_type: { type: 'string' },
      file_size: { type: 'string' },
      filename: { type: 'string' },
      url: { type: 'string', format: 'uri' },
      title: { type: 'string' },
      description: { type: 'string' },
    },
  };

  schemas.Locale = { type: 'object', properties: { code: { type: 'string' }, name: { type: 'string' }, fallback_locale: { type: 'string' } } };

  return schemas;
}
