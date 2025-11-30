/**
 * UUID Validation Utilities
 *
 * Validates entity IDs and provides helpful error messages
 * when the AI passes invalid IDs to tools.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Create a helpful error message when an invalid ID is provided.
 * Guides the AI to use search_entities to find the correct ID.
 */
export function createInvalidIdError(value: string): string {
  // Truncate very long values to keep error message readable
  const displayValue = value.length > 50 ? value.slice(0, 47) + "..." : value;

  return `"${displayValue}" is not a valid entity ID. Entity IDs are UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000").

To find an entity's ID by name, use the search_entities tool:
  search_entities({ query: "${displayValue}" })

Then use the returned ID with this tool.`;
}
