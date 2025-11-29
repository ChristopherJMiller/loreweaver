/**
 * search_entities MCP Tool
 *
 * Search for entities in the campaign using full-text search.
 * Calls the existing search_entities Tauri command.
 */

// TODO: Implement once @anthropic-ai/claude-agent-sdk is installed (#56)
//
// import { tool } from "@anthropic-ai/claude-agent-sdk";
// import { z } from "zod";
// import { invoke } from "@tauri-apps/api/core";
//
// const SearchEntitiesSchema = z.object({
//   campaign_id: z.string().uuid().describe("The campaign ID to search within"),
//   query: z.string().min(1).describe("Search query text"),
//   entity_types: z
//     .array(
//       z.enum([
//         "character",
//         "location",
//         "organization",
//         "quest",
//         "hero",
//         "player",
//         "session",
//         "timeline_event",
//         "secret",
//       ])
//     )
//     .optional()
//     .describe("Filter by specific entity types"),
//   limit: z
//     .number()
//     .int()
//     .min(1)
//     .max(50)
//     .default(10)
//     .describe("Maximum number of results to return"),
// });
//
// export const searchEntitiesTool = tool(
//   "search_entities",
//   "Search for entities (characters, locations, organizations, etc.) in the campaign using full-text search.",
//   SearchEntitiesSchema,
//   async (args) => {
//     try {
//       const results = await invoke("search_entities", {
//         campaign_id: args.campaign_id,
//         query: args.query,
//         entity_types: args.entity_types,
//         limit: args.limit,
//       });
//
//       if (!Array.isArray(results) || results.length === 0) {
//         return {
//           content: [
//             { type: "text", text: `No entities found matching "${args.query}"` },
//           ],
//         };
//       }
//
//       const formatted = results
//         .map(
//           (r) =>
//             `- **${r.name}** (${r.entity_type}, id: ${r.entity_id})${r.snippet ? `\n  ${r.snippet}` : ""}`
//         )
//         .join("\n");
//
//       return {
//         content: [
//           {
//             type: "text",
//             text: `Found ${results.length} entities:\n\n${formatted}`,
//           },
//         ],
//       };
//     } catch (error) {
//       return {
//         content: [{ type: "text", text: `Error searching entities: ${error}` }],
//       };
//     }
//   }
// );

export const searchEntitiesTool = null; // Placeholder
