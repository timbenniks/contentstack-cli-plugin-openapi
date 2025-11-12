import type { ContentType } from '@contentstack/management/types/stack/contentType';
import type { JSONSchema } from './schema-mapper';
import { getSchemaName } from './schema-mapper';

export type APIMode = 'delivery' | 'management';

export interface OpenAPIPath {
  [path: string]: {
    [method: string]: {
      summary?: string;
      description?: string;
      operationId?: string;
      tags?: string[];
      parameters?: Array<{
        name?: string;
        $ref?: string;
        in?: string;
        description?: string;
        required?: boolean;
        schema?: JSONSchema & { default?: unknown };
        style?: string;
        explode?: boolean;
        example?: unknown;
      }>;
      requestBody?: {
        content: {
          [contentType: string]: {
            schema: JSONSchema;
          };
        };
      };
      responses: {
        [statusCode: string]: {
          description: string;
          content?: {
            [contentType: string]: {
              schema: JSONSchema;
              example?: unknown;
            };
          };
        };
      };
      security?: Array<{ [scheme: string]: string[] }>;
    };
  };
}

/**
 * Generate OpenAPI paths for content types
 */
export function generatePaths(
  contentTypes: ContentType[],
  schemas: Record<string, JSONSchema>,
  mode: APIMode,
  options: {
    includeDrafts?: boolean;
    defaultLocale?: string;
    defaultEnv?: string;
  } = {}
): OpenAPIPath {
  const paths: OpenAPIPath = {};
  
  contentTypes.forEach(ct => {
    const contentTypeUid = ct.uid;
    const schemaName = getSchemaName(contentTypeUid);
    const schema = schemas[schemaName];
    
    if (mode === 'delivery') {
      // Delivery API paths - use shared parameters
      paths[`/v3/content_types/${contentTypeUid}/entries`] = {
        get: {
          summary: `List ${ct.title || contentTypeUid} entries`,
          description: `Retrieve a list of ${ct.title || contentTypeUid} entries with optional filtering and pagination`,
          operationId: `list${schemaName}Entries`,
          tags: [ct.title || contentTypeUid],
          parameters: [
            { $ref: '#/components/parameters/Environment' },
            { $ref: '#/components/parameters/Locale' },
            { $ref: '#/components/parameters/IncludeArray' },
            { $ref: '#/components/parameters/Query' },
            { $ref: '#/components/parameters/Asc' },
            { $ref: '#/components/parameters/Desc' },
            { $ref: '#/components/parameters/Skip' },
            { $ref: '#/components/parameters/Limit' },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      entries: {
                        type: 'array',
                        items: {
                          allOf: [
                            schema,
                            { $ref: '#/components/schemas/EntryMeta' },
                          ],
                        },
                      },
                      count: { type: 'integer' },
                    },
                  },
                  example: {
                    entries: [
                      {
                        uid: 'entry-123',
                        title: 'Example Entry',
                        created_at: '2024-01-01T00:00:00Z',
                        updated_at: '2024-01-01T00:00:00Z',
                        _version: 1,
                      },
                    ],
                    count: 1,
                  },
                },
              },
            },
          },
          security: [{ ApiKey: [], DeliveryTokenAuth: [] }],
        },
      };
      
      paths[`/v3/content_types/${contentTypeUid}/entries/{uid}`] = {
        get: {
          summary: `Get ${ct.title || contentTypeUid} entry by UID`,
          description: `Retrieve a specific ${ct.title || contentTypeUid} entry by its UID`,
          operationId: `get${schemaName}Entry`,
          tags: [ct.title || contentTypeUid],
          parameters: [
            { $ref: '#/components/parameters/Uid' },
            { $ref: '#/components/parameters/Environment' },
            { $ref: '#/components/parameters/Locale' },
            { $ref: '#/components/parameters/IncludeArray' },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      schema,
                      { $ref: '#/components/schemas/EntryMeta' },
                    ],
                  },
                  example: {
                    uid: 'entry-123',
                    title: 'Example Entry',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                    _version: 1,
                  },
                },
              },
            },
            '404': {
              description: 'Entry not found',
            },
          },
          security: [{ ApiKey: [], DeliveryTokenAuth: [] }],
        },
      };
    } else {
      // Management API paths
      paths[`/v3/content_types/${contentTypeUid}/entries`] = {
        get: {
          summary: `List ${ct.title || contentTypeUid} entries`,
          description: `Retrieve a list of ${ct.title || contentTypeUid} entries`,
          operationId: `list${schemaName}Entries`,
          tags: [ct.title || contentTypeUid],
          parameters: [
            { $ref: '#/components/parameters/Environment' },
            { $ref: '#/components/parameters/Locale' },
            { $ref: '#/components/parameters/Skip' },
            { $ref: '#/components/parameters/Limit' },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      entries: {
                        type: 'array',
                        items: {
                          allOf: [
                            schema,
                            { $ref: '#/components/schemas/EntryMeta' },
                          ],
                        },
                      },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
          security: [{ ManagementTokenAuth: [] }],
        },
        post: {
          summary: `Create ${ct.title || contentTypeUid} entry`,
          description: `Create a new ${ct.title || contentTypeUid} entry`,
          operationId: `create${schemaName}Entry`,
          tags: [ct.title || contentTypeUid],
          parameters: [
            { $ref: '#/components/parameters/Environment' },
            { $ref: '#/components/parameters/Locale' },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: schema,
              },
            },
          },
          responses: {
            '201': {
              description: 'Entry created successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      schema,
                      { $ref: '#/components/schemas/EntryMeta' },
                    ],
                  },
                },
              },
            },
            '400': {
              description: 'Bad request',
            },
          },
          security: [{ ManagementTokenAuth: [] }],
        },
      };
      
      paths[`/v3/content_types/${contentTypeUid}/entries/{uid}`] = {
        get: {
          summary: `Get ${ct.title || contentTypeUid} entry by UID`,
          description: `Retrieve a specific ${ct.title || contentTypeUid} entry by its UID`,
          operationId: `get${schemaName}Entry`,
          tags: [ct.title || contentTypeUid],
          parameters: [
            { $ref: '#/components/parameters/Uid' },
            { $ref: '#/components/parameters/Environment' },
            { $ref: '#/components/parameters/Locale' },
            {
              name: 'version',
              in: 'query',
              description: 'Entry version',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      schema,
                      { $ref: '#/components/schemas/EntryMeta' },
                    ],
                  },
                },
              },
            },
            '404': {
              description: 'Entry not found',
            },
          },
          security: [{ ManagementTokenAuth: [] }],
        },
        put: {
          summary: `Update ${ct.title || contentTypeUid} entry`,
          description: `Update an existing ${ct.title || contentTypeUid} entry`,
          operationId: `update${schemaName}Entry`,
          tags: [ct.title || contentTypeUid],
          parameters: [
            { $ref: '#/components/parameters/Uid' },
            { $ref: '#/components/parameters/Environment' },
            { $ref: '#/components/parameters/Locale' },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: schema,
              },
            },
          },
          responses: {
            '200': {
              description: 'Entry updated successfully',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      schema,
                      { $ref: '#/components/schemas/EntryMeta' },
                    ],
                  },
                },
              },
            },
            '404': {
              description: 'Entry not found',
            },
          },
          security: [{ ManagementTokenAuth: [] }],
        },
        delete: {
          summary: `Delete ${ct.title || contentTypeUid} entry`,
          description: `Delete a ${ct.title || contentTypeUid} entry`,
          operationId: `delete${schemaName}Entry`,
          tags: [ct.title || contentTypeUid],
          parameters: [
            { $ref: '#/components/parameters/Uid' },
            { $ref: '#/components/parameters/Environment' },
          ],
          responses: {
            '200': {
              description: 'Entry deleted successfully',
            },
            '404': {
              description: 'Entry not found',
            },
          },
          security: [{ ManagementTokenAuth: [] }],
        },
      };
    }
  });
  
  // Add common asset endpoints
  if (mode === 'delivery') {
    paths['/v3/assets'] = {
      get: {
        summary: 'List assets',
        description: 'Retrieve a list of assets',
        operationId: 'listAssets',
        tags: ['Assets'],
        parameters: [
          { $ref: '#/components/parameters/Environment' },
          { $ref: '#/components/parameters/Skip' },
          { $ref: '#/components/parameters/Limit' },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    assets: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Asset' },
                    },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        security: [{ ApiKey: [], DeliveryTokenAuth: [] }],
      },
    };
    
    paths['/v3/assets/{uid}'] = {
      get: {
        summary: 'Get asset by UID',
        description: 'Retrieve a specific asset by its UID',
        operationId: 'getAsset',
        tags: ['Assets'],
        parameters: [
          { $ref: '#/components/parameters/Uid' },
          { $ref: '#/components/parameters/Environment' },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' },
              },
            },
          },
          '404': {
            description: 'Asset not found',
          },
        },
        security: [{ ApiKey: [], DeliveryTokenAuth: [] }],
      },
    };
  } else {
    paths['/v3/assets'] = {
      get: {
        summary: 'List assets',
        description: 'Retrieve a list of assets',
        operationId: 'listAssets',
        tags: ['Assets'],
        parameters: [
          { $ref: '#/components/parameters/Environment' },
          { $ref: '#/components/parameters/Skip' },
          { $ref: '#/components/parameters/Limit' },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    assets: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Asset' },
                    },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        security: [{ ManagementTokenAuth: [] }],
      },
      post: {
        summary: 'Create asset',
        description: 'Create a new asset',
        operationId: 'createAsset',
        tags: ['Assets'],
        parameters: [
          { $ref: '#/components/parameters/Environment' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Asset' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Asset created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' },
              },
            },
          },
        },
        security: [{ ManagementTokenAuth: [] }],
      },
    };
    
    paths['/v3/assets/{uid}'] = {
      get: {
        summary: 'Get asset by UID',
        description: 'Retrieve a specific asset by its UID',
        operationId: 'getAsset',
        tags: ['Assets'],
        parameters: [
          { $ref: '#/components/parameters/Uid' },
          { $ref: '#/components/parameters/Environment' },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' },
              },
            },
          },
          '404': {
            description: 'Asset not found',
          },
        },
        security: [{ ManagementTokenAuth: [] }],
      },
      put: {
        summary: 'Update asset',
        description: 'Update an existing asset',
        operationId: 'updateAsset',
        tags: ['Assets'],
        parameters: [
          { $ref: '#/components/parameters/Uid' },
          { $ref: '#/components/parameters/Environment' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Asset' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Asset updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Asset' },
              },
            },
          },
          '404': {
            description: 'Asset not found',
          },
        },
        security: [{ ManagementTokenAuth: [] }],
      },
      delete: {
        summary: 'Delete asset',
        description: 'Delete an asset',
        operationId: 'deleteAsset',
        tags: ['Assets'],
        parameters: [
          { $ref: '#/components/parameters/Uid' },
          { $ref: '#/components/parameters/Environment' },
        ],
        responses: {
          '200': {
            description: 'Asset deleted successfully',
          },
          '404': {
            description: 'Asset not found',
          },
        },
        security: [{ ManagementTokenAuth: [] }],
      },
    };
  }
  
  return paths;
}
