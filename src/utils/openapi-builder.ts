import type { ContentType } from '@contentstack/management/types/stack/contentType';
import type { GlobalField } from '@contentstack/management/types/stack/globalField';
import type { JSONSchema } from './schema-mapper';
import { buildContentTypeSchemas } from './schema-mapper';
import { generatePaths } from './path-generator';
import type { APIMode } from './path-generator';
import { normalizeRegion, getAllRegions } from './regions';

export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers: Array<{ url: string; description?: string }>;
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, JSONSchema>;
    parameters?: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  security: Array<Record<string, string[]>>;
}

function createQueryParam(name: string, schema: Record<string, unknown>, description: string, example?: unknown): Record<string, unknown> {
  const param: Record<string, unknown> = { name, in: 'query', schema, description };
  if (example !== undefined) param.example = example;
  return param;
}

function createSecurityScheme(type: string, inLocation: string, name: string, description: string, bearerFormat?: string): Record<string, unknown> {
  const scheme: Record<string, unknown> = { type, in: inLocation, name, description };
  if (bearerFormat) scheme.bearerFormat = bearerFormat;
  return scheme;
}

export async function buildOpenAPISpec(
  contentTypes: ContentType[],
  globalFields: GlobalField[],
  options: {
    title: string;
    version: string;
    description?: string;
    mode: APIMode;
    region: string;
    defaultEnv?: string;
    defaultLocale?: string;
    includeDrafts?: boolean;
  }
): Promise<OpenAPISpec> {
  const schemas = buildContentTypeSchemas(contentTypes, globalFields);
  const paths = generatePaths(contentTypes, schemas, options.mode, {
    includeDrafts: options.includeDrafts,
    defaultLocale: options.defaultLocale,
    defaultEnv: options.defaultEnv,
  });

  const normalizedRegion = await normalizeRegion(options.region);
  const allRegions = await getAllRegions();
  const servers = allRegions
    .sort((a, b) => (a.id === normalizedRegion ? -1 : b.id === normalizedRegion ? 1 : 0))
    .map(r => ({ url: r.endpoints.contentDelivery, description: `${r.name} (${r.id})` }));

  const parameters = {
    Environment: createQueryParam('environment', { type: 'string', default: options.defaultEnv || 'production' }, 'Environment name', 'production'),
    Locale: createQueryParam('locale', { type: 'string', default: options.defaultLocale || 'en-us' }, 'Locale code', 'en-us'),
    IncludeArray: { name: 'include[]', in: 'query', style: 'form', explode: true, schema: { type: 'array', items: { type: 'string' }, default: options.includeDrafts ? ['publish_details'] : [] }, description: 'Include related content' },
    Query: createQueryParam('query', { type: 'string' }, 'JSON-encoded filter object', '{"title": {"$exists": true}}'),
    Asc: createQueryParam('asc', { type: 'string' }, 'Sort ascending by field', 'created_at'),
    Desc: createQueryParam('desc', { type: 'string' }, 'Sort descending by field', 'updated_at'),
    Skip: createQueryParam('skip', { type: 'integer', minimum: 0, default: 0 }, 'Number of entries to skip', 0),
    Limit: createQueryParam('limit', { type: 'integer', minimum: 1, maximum: 100, default: 100 }, 'Maximum number of entries to return', 10),
    Uid: { name: 'uid', in: 'path', required: true, schema: { type: 'string' }, description: 'Entry or asset UID', example: 'entry-123' },
  };

  const securitySchemes: Record<string, unknown> = {
    ApiKey: createSecurityScheme('apiKey', 'header', 'api_key', 'Contentstack stack API key'),
    DeliveryTokenAuth: createSecurityScheme('apiKey', 'header', 'access_token', 'Content Delivery API access token'),
  };

  if (options.mode === 'management') {
    securitySchemes.ManagementTokenAuth = createSecurityScheme('http', 'header', 'Authorization', 'Content Management API authentication token', 'JWT');
  }

  return {
    openapi: '3.1.0',
    info: { title: options.title, version: options.version, description: options.description },
    servers,
    paths,
    components: { schemas, parameters, securitySchemes },
    security: options.mode === 'delivery' ? [{ ApiKey: [], DeliveryTokenAuth: [] }] : [{ ManagementTokenAuth: [] }],
  };
}
