#!/usr/bin/env node

/**
 * MCP Server for Design Model.
 * Exposes design model validation, fix suggestions, and application via MCP protocol.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { getDesignModel, validate, suggestFixesTool, applyFixes } from "./tools";
import type { ParsedIntent } from "../resolver/parseIntent";
import type { Violation, JsonPatchOperation } from "../resolver/types";

const server = new Server(
  {
    name: "design-model",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "getDesignModel",
        description: "Get the design model metadata (tokens, contracts, enabled constraints)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "validate",
        description: "Validate a view spec against enabled constraints (read-only, doesn't mutate input)",
        inputSchema: {
          type: "object",
          properties: {
            viewSpec: {
              type: "object",
              description: "The parsed view spec (ParsedIntent)",
            },
            enabledConstraints: {
              type: "object",
              description: "Record of constraint IDs to boolean enabled state",
              additionalProperties: { type: "boolean" },
            },
          },
          required: ["viewSpec", "enabledConstraints"],
        },
      },
      {
        name: "suggestFixes",
        description: "Suggest fixes for constraint violations as JSON patch operations",
        inputSchema: {
          type: "object",
          properties: {
            viewSpec: {
              type: "object",
              description: "The parsed view spec (ParsedIntent)",
            },
            enabledConstraints: {
              type: "object",
              description: "Record of constraint IDs to boolean enabled state",
              additionalProperties: { type: "boolean" },
            },
            violations: {
              type: "array",
              description: "Array of violations from validate()",
              items: {
                type: "object",
              },
            },
          },
          required: ["viewSpec", "enabledConstraints", "violations"],
        },
      },
      {
        name: "applyFixes",
        description: "Apply JSON patch operations to a view spec and return the updated spec",
        inputSchema: {
          type: "object",
          properties: {
            viewSpec: {
              type: "object",
              description: "The parsed view spec (ParsedIntent)",
            },
            fixes: {
              type: "array",
              description: "Array of JSON patch operations from suggestFixes()",
              items: {
                type: "object",
                properties: {
                  op: { type: "string" },
                  path: { type: "string" },
                  value: {},
                },
              },
            },
          },
          required: ["viewSpec", "fixes"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "getDesignModel": {
        const result = getDesignModel();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "validate": {
        const viewSpec = args?.viewSpec as ParsedIntent;
        const enabledConstraints = args?.enabledConstraints as Record<string, boolean>;

        if (!viewSpec || !enabledConstraints) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "viewSpec and enabledConstraints are required"
          );
        }

        const result = validate({ viewSpec, enabledConstraints });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "suggestFixes": {
        const viewSpec = args?.viewSpec as ParsedIntent;
        const enabledConstraints = args?.enabledConstraints as Record<string, boolean>;
        const violations = args?.violations as Violation[];

        if (!viewSpec || !enabledConstraints || !violations) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "viewSpec, enabledConstraints, and violations are required"
          );
        }

        const result = suggestFixesTool({ viewSpec, enabledConstraints, violations });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "applyFixes": {
        const viewSpec = args?.viewSpec as ParsedIntent;
        const fixes = args?.fixes as JsonPatchOperation[];

        if (!viewSpec || !fixes) {
          throw new McpError(
            ErrorCode.InvalidParams,
            "viewSpec and fixes are required"
          );
        }

        const result = applyFixes({ viewSpec, fixes });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Design Model MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
