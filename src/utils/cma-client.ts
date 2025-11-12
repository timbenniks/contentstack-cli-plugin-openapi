import { client } from '@contentstack/management';
import type { Stack } from '@contentstack/management/types/stack';
import type { ContentType } from '@contentstack/management/types/stack/contentType';
import type { GlobalField } from '@contentstack/management/types/stack/globalField';
import type { ContentstackCollection } from '@contentstack/management/types/contentstackCollection';

export interface StackInfo {
  name: string;
  uid: string;
}

/**
 * Create a CMA client for the given stack
 */
export function createCMAClient(apiKey: string, authtoken: string, cmaHost: string): Stack {
  return client({
    authtoken,
    host: cmaHost,
  }).stack({
    api_key: apiKey,
    management_token: authtoken,
  });
}

/**
 * Fetch all content types from a stack
 */
export async function fetchContentTypes(
  stack: Stack
): Promise<ContentType[]> {
  try {
    const contentTypes: ContentType[] = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const response: ContentstackCollection<ContentType> = await stack.contentType().query({
        skip,
        limit,
      }).find();
      
      if (response.items && response.items.length > 0) {
        contentTypes.push(...response.items);
        skip += response.items.length;
        hasMore = response.items.length === limit;
      } else {
        hasMore = false;
      }
    }
    
    return contentTypes;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch content types: ${errorMessage}`);
  }
}

/**
 * Fetch all global fields from a stack
 */
export async function fetchGlobalFields(
  stack: Stack
): Promise<GlobalField[]> {
  try {
    const globalFields: GlobalField[] = [];
    let skip = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const response: ContentstackCollection<GlobalField> = await stack.globalField().query({
        skip,
        limit,
      }).find();
      
      if (response.items && response.items.length > 0) {
        globalFields.push(...response.items);
        skip += response.items.length;
        hasMore = response.items.length === limit;
      } else {
        hasMore = false;
      }
    }
    
    return globalFields;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch global fields: ${errorMessage}`);
  }
}

/**
 * Fetch stack information
 * Since we already have the API key, we can use the stack-specific endpoint
 */
export async function fetchStackInfo(
  stack: Stack,
  apiKey: string
): Promise<StackInfo> {
  try {
    // Try to fetch stack info using the stack-specific endpoint
    // If that fails, we'll use the API key as fallback
    try {
      const stackData = await stack.fetch();
      return {
        name: stackData.name || `Stack ${apiKey}`,
        uid: stackData.api_key || apiKey,
      };
    } catch (fetchError) {
      // If fetch fails (e.g., token doesn't have access to /stacks),
      // we can still proceed with just the API key
      // The stack instance is already initialized with the API key
      return {
        name: `Stack ${apiKey}`,
        uid: apiKey,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch stack information: ${errorMessage}`);
  }
}

