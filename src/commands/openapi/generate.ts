import { Command } from '@contentstack/cli-command';
import { flags, FlagInput, configHandler } from '@contentstack/cli-utilities';
import * as fs from 'fs-extra';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SwaggerParser = require('@apidevtools/swagger-parser');
import { createCMAClient, fetchContentTypes, fetchGlobalFields, fetchStackInfo } from '../../utils/cma-client';
import { buildOpenAPISpec } from '../../utils/openapi-builder';
import type { APIMode } from '../../utils/path-generator';
import { getCMAEndpoint, getCDAEndpoint, normalizeRegion } from '../../utils/regions';

function getManagementToken(command: Generate, tokenAlias?: string): string {
  if (tokenAlias) {
    try {
      const tokenData = command.getToken(tokenAlias);
      if (typeof tokenData === 'object' && tokenData !== null) {
        return (tokenData as { token?: string; authtoken?: string }).authtoken ||
          (tokenData as { token?: string; authtoken?: string }).token ||
          '';
      }
      if (typeof tokenData === 'string') return tokenData;
    } catch {
      // Fall through to default
    }
  }

  return configHandler.get('authtoken') ||
    process.env.CS_AUTHTOKEN ||
    process.env.CONTENTSTACK_MANAGEMENT_TOKEN ||
    '';
}

export default class Generate extends Command {
  static description = 'Generate OpenAPI 3.1 JSON specification for a Contentstack stack';

  static examples = [
    '$ csdx openapi:generate -s blt1234567890abcdef --token-alias my-management-token-alias',
    '$ csdx openapi:generate -s blt1234567890abcdef -t my-management-token-alias -e production --title "MyStack Delivery API" -o ./openapi.json',
    '$ csdx openapi:generate -s blt1234567890abcdef -t my-management-token-alias -m management --title "MyStack Management API" --version 1.2.0',
  ];

  static flags: FlagInput = {
    stack: flags.string({ char: 's', description: 'Stack API key', required: true }),
    'token-alias': flags.string({ char: 't', description: 'Management token alias', required: true }),
    mode: flags.string({ char: 'm', description: 'API mode: delivery or management', options: ['delivery', 'management'], default: 'delivery' }),
    region: flags.string({ char: 'r', description: 'Contentstack region (e.g., na, us, eu, azure-na, azure-eu, gcp-na, gcp-eu, au). Accepts region ID or alias. Defaults to CLI config region.' }),
    env: flags.string({ char: 'e', description: 'CDA environment name for examples and server URL templating' }),
    out: flags.string({ char: 'o', description: 'Output file path', default: 'openapi.json' }),
    format: flags.string({ description: 'Output format: json or yaml', options: ['json', 'yaml'], default: 'json' }),
    title: flags.string({ description: 'OpenAPI info.title' }),
    version: flags.string({ description: 'OpenAPI info.version', default: '1.0.0' }),
    locale: flags.string({ description: 'Default locale code for examples' }),
    'include-drafts': flags.boolean({ description: 'Include drafts in CDA example query params' }),
    servers: flags.string({ description: 'Comma-separated list of server URLs (overrides region config)' }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Generate);

    try {
      const managementToken = getManagementToken(this, flags['token-alias']);
      if (!managementToken) {
        throw new Error(`Management token not found for alias "${flags['token-alias']}". Please ensure the token alias exists in your CLI configuration.`);
      }

      const regionName = flags.region || (this.region.name === 'NA' ? 'us' : this.region.name.toLowerCase());
      const normalizedRegion = await normalizeRegion(regionName);
      const cmaHost = this.cmaHost || await getCMAEndpoint(normalizedRegion);
      const cdaHost = this.cdaHost || await getCDAEndpoint(normalizedRegion);

      this.log(`Connecting to stack ${flags.stack}...`);
      const client = createCMAClient(flags.stack, managementToken, cmaHost);
      const stackInfo = await fetchStackInfo(client, flags.stack);
      const stackTitle = flags.title || `${stackInfo.name} API`;

      this.log('Fetching content types...');
      const contentTypes = await fetchContentTypes(client);
      this.log(`Found ${contentTypes.length} content type(s)`);

      this.log('Fetching global fields...');
      const globalFields = await fetchGlobalFields(client);
      this.log(`Found ${globalFields.length} global field(s)`);

      if (contentTypes.length === 0) {
        this.warn('No content types found in this stack. The generated OpenAPI spec will only include common endpoints.');
      }

      this.log('Building OpenAPI 3.1 specification...');
      const openApiDoc = await buildOpenAPISpec(contentTypes, globalFields, {
        title: stackTitle,
        version: flags.version,
        description: `OpenAPI 3.1 specification for ${stackInfo.name} stack (${flags.mode} API)`,
        mode: flags.mode as APIMode,
        region: normalizedRegion,
        defaultEnv: flags.env,
        defaultLocale: flags.locale,
        includeDrafts: flags['include-drafts'],
      });

      this.log('Validating OpenAPI specification...');
      try {
        await SwaggerParser.validate(openApiDoc);
        this.log('✓ OpenAPI specification is valid');
      } catch (validationError) {
        this.warn(`OpenAPI validation warning: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
      }

      const outputPath = path.resolve(flags.out);
      this.log(`Writing OpenAPI specification to ${outputPath}...`);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeJson(outputPath, openApiDoc, { spaces: 2 });

      this.log(`✓ Successfully generated OpenAPI 3.1 specification`);
      this.log(`  Stack: ${stackInfo.name}`);
      this.log(`  Content Types: ${contentTypes.length}`);
      this.log(`  Global Fields: ${globalFields.length}`);
      this.log(`  Mode: ${flags.mode}`);
      this.log(`  Output: ${outputPath}`);
    } catch (error) {
      this.error(`Failed to generate OpenAPI specification: ${error instanceof Error ? error.message : String(error)}`, { exit: 1 });
    }
  }
}
