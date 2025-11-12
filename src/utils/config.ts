import * as fs from 'fs-extra';
import * as path from 'path';
import { homedir } from 'os';

export interface CLIConfig {
  region?: {
    name: string;
    cda?: string;
    cma?: string;
  };
  authtoken?: string;
  [key: string]: unknown;
}

export interface RegionConfig {
  name: string;
  cdaHost: string;
  cmaHost: string;
}

// Contentstack CLI stores config in ~/.contentstack_cli/config.json
const CONFIG_PATH = path.join(homedir(), '.contentstack_cli', 'config.json');

/**
 * Read CLI configuration from ~/.contentstack_cli/config.json
 */
export async function readCLIConfig(): Promise<CLIConfig> {
  try {
    if (await fs.pathExists(CONFIG_PATH)) {
      return await fs.readJson(CONFIG_PATH);
    }
    return {};
  } catch (error) {
    return {};
  }
}

/**
 * Get authentication token from config or environment variables
 */
export async function getAuthToken(): Promise<string | null> {
  const config = await readCLIConfig();
  
  // Check config first
  if (config.authtoken) {
    return config.authtoken as string;
  }
  
  // Check environment variables
  return process.env.CS_AUTHTOKEN || 
         process.env.CONTENTSTACK_MANAGEMENT_TOKEN || 
         null;
}

/**
 * Get region configuration from CLI config
 */
export async function getRegionConfig(): Promise<RegionConfig | null> {
  const config = await readCLIConfig();
  
  if (!config.region) {
    return null;
  }
  
  const region = config.region as { name: string; cda?: string; cma?: string };
  
  // Default hosts based on region name if not specified
  const defaultHosts = getDefaultHosts(region.name);
  
  return {
    name: region.name,
    cdaHost: region.cda || defaultHosts.cda,
    cmaHost: region.cma || defaultHosts.cma,
  };
}

/**
 * Get default hosts for known regions
 */
function getDefaultHosts(regionName: string): { cda: string; cma: string } {
  const regionLower = regionName.toLowerCase();
  
  // Default to US region
  let cda = 'https://cdn.contentstack.io';
  let cma = 'https://api.contentstack.io';
  
  if (regionLower.includes('eu') || regionLower.includes('europe')) {
    cda = 'https://eu-cdn.contentstack.com';
    cma = 'https://eu-api.contentstack.com';
  } else if (regionLower.includes('azure')) {
    cda = 'https://azure-cdn.contentstack.com';
    cma = 'https://azure-api.contentstack.com';
  } else if (regionLower.includes('azure-eu')) {
    cda = 'https://azure-eu-cdn.contentstack.com';
    cma = 'https://azure-eu-api.contentstack.com';
  }
  
  return { cda, cma };
}

/**
 * Validate that authentication and region are configured
 */
export async function validateCLIConfig(): Promise<{ token: string; region: RegionConfig }> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error(
      'Authentication token not found. Please run `csdx login` or set CS_AUTHTOKEN environment variable.'
    );
  }
  
  const region = await getRegionConfig();
  if (!region) {
    throw new Error(
      'Region not configured. Please run `csdx config:set:region <region>` to set your region.'
    );
  }
  
  return { token, region };
}

