/**
 * Campaign Context Tools
 *
 * Tools for the AI agent to access campaign data.
 * These wrap Tauri commands and format results as markdown.
 */

export { searchEntitiesTool } from "./search-entities";
export { getEntityTool } from "./get-entity";
export { getRelationshipsTool } from "./get-relationships";
export { getLocationHierarchyTool } from "./get-location-hierarchy";
export { getTimelineTool } from "./get-timeline";
export { getCampaignContextTool } from "./get-campaign-context";
export { getPageContextTool } from "./get-page-context";

import type { ToolDefinition } from "../types";
import { searchEntitiesTool } from "./search-entities";
import { getEntityTool } from "./get-entity";
import { getRelationshipsTool } from "./get-relationships";
import { getLocationHierarchyTool } from "./get-location-hierarchy";
import { getTimelineTool } from "./get-timeline";
import { getCampaignContextTool } from "./get-campaign-context";
import { getPageContextTool } from "./get-page-context";

/**
 * Get all campaign context tools
 */
export function getCampaignContextTools(): ToolDefinition[] {
  return [
    searchEntitiesTool,
    getEntityTool,
    getRelationshipsTool,
    getLocationHierarchyTool,
    getTimelineTool,
    getCampaignContextTool,
    getPageContextTool,
  ];
}
