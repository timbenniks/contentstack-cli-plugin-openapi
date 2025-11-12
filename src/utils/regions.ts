import * as https from 'https';

export interface Region {
  id: string;
  name: string;
  alias: string[];
  endpoints: {
    contentDelivery: string;
    contentManagement: string;
    [key: string]: string;
  };
}

interface RegionsData {
  regions: Region[];
}

let cachedRegions: RegionsData | null = null;

async function fetchRegionsData(): Promise<RegionsData> {
  if (cachedRegions) return cachedRegions;

  return new Promise((resolve, reject) => {
    https.get('https://artifacts.contentstack.com/regions.json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          cachedRegions = JSON.parse(data) as RegionsData;
          resolve(cachedRegions!);
        } catch (error) {
          reject(new Error(`Failed to parse regions.json: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    }).on('error', error => reject(new Error(`Failed to fetch regions.json: ${error.message}`)));
  });
}

function findRegion(regionInput: string, regions: Region[]): Region | null {
  const normalized = regionInput.toLowerCase();
  return regions.find(r => 
    r.id.toLowerCase() === normalized || 
    r.alias.some(a => a.toLowerCase() === normalized)
  ) || null;
}

export async function normalizeRegion(regionInput: string): Promise<string> {
  const regions = await fetchRegionsData();
  return findRegion(regionInput, regions.regions)?.id || 'na';
}

async function getRegion(regionInput: string): Promise<Region> {
  const regions = await fetchRegionsData();
  const regionId = await normalizeRegion(regionInput);
  const region = regions.regions.find(r => r.id === regionId);
  if (!region) throw new Error(`Region ${regionId} not found`);
  return region;
}

export async function getCDAEndpoint(regionInput: string): Promise<string> {
  return (await getRegion(regionInput)).endpoints.contentDelivery;
}

export async function getCMAEndpoint(regionInput: string): Promise<string> {
  return (await getRegion(regionInput)).endpoints.contentManagement;
}

export async function getAllRegions(): Promise<Region[]> {
  return (await fetchRegionsData()).regions;
}
