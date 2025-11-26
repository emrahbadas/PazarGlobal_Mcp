import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import * as z from "zod/v4";

dotenv.config();

// Import tool handlers
import cleanPrice from "./tools/cleanPrice.js";
import insertListing from "./tools/insertListing.js";

// Create MCP server
const server = new McpServer({
    name: "PazarGlobal MCP Server",
    version: "1.0.0",
});

// Track registered tool names for status reporting
const registeredTools = [];

/**
 * Register clean_price tool
 */
server.registerTool(
    "clean_price",
    {
        title: "Clean Price",
        description: "Clean and parse price text to numeric value",
        inputSchema: {
            price_text: z.string().describe("Price text to clean (e.g., '1,234 TL')")
        },
        outputSchema: {
            clean_price: z.number().nullable()
        }
    },
    async ({ price_text }) => {
        const result = await cleanPrice({ price_text });
        return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result
        };
    }
);
registeredTools.push("clean_price");

/**
 * Register insert_listing tool
 */
server.registerTool(
    "insert_listing",
    {
        title: "Insert Listing",
        description: "Insert a new product listing to Supabase database",
        inputSchema: {
            product_name: z.string().describe("Product name"),
            brand: z.string().optional().describe("Brand name"),
            condition: z.string().optional().describe("Product condition"),
            category: z.string().optional().describe("Product category"),
            description: z.string().optional().describe("Product description"),
            original_price_text: z.string().optional().describe("Original price text"),
            clean_price: z.number().optional().describe("Cleaned numeric price")
        },
        outputSchema: {
            success: z.boolean(),
            status: z.number(),
            result: z.any()
        }
    },
    async (args) => {
        const result = await insertListing(args);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }],
            structuredContent: result
        };
    }
);
registeredTools.push("insert_listing");

// JSON schema for each tool (used by Agent Builder discovery)
const toolSchemas = {
    clean_price: {
        type: "object",
        properties: {
            price_text: {
                type: "string",
                description: "Raw price text (e.g. '12 bin TL')"
            }
        },
        required: ["price_text"]
    },
    insert_listing: {
        type: "object",
        properties: {
            product_name: { type: "string" },
            brand: { type: "string" },
            condition: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            original_price_text: { type: "string" },
            clean_price: { type: "number" }
        },
        required: [
            "product_name", "brand",
            "condition", "category",
            "description", "original_price_text",
            "clean_price"
        ]
    }
};

// Simple mapping of tool handlers for JSON-RPC calls
const toolHandlers = {
    clean_price: async (args) => await cleanPrice(args),
    insert_listing: async (args) => await insertListing(args)
};

// Set up Express server
const app = express();
app.use(express.json());

// --- CORS Fix for MCP Browser Clients ---
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Expose-Headers", "*");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// MCP JSON-RPC handler
app.post("/mcp", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const { jsonrpc, method, id, params } = req.body || {};
    if (!method) return res.status(400).json({ error: "Invalid JSON-RPC request" });

    if (method === "tools/list") {
        return res.json({
            jsonrpc: "2.0",
            id,
            result: {
                tools: Object.entries(toolSchemas).map(([name, schema]) => ({
                    name,
                    description: `MCP Tool: ${name}`,
                    parameters: schema,
                    required: schema.required
                }))
            }
        });
    }

    if (method === "tools/call") {
        const { name, arguments: args } = params || {};
        const handler = toolHandlers[name];
        if (!handler) {
            return res.json({
                jsonrpc: "2.0",
                id,
                error: { message: `Unknown tool: ${name}` }
            });
        }
        try {
            const result = await handler(args);
            return res.json({ jsonrpc: "2.0", id, result });
        } catch (err) {
            return res.json({ jsonrpc: "2.0", id, error: { message: err?.message || String(err) } });
        }
    }

    return res.json({
        jsonrpc: "2.0",
        id,
        error: { message: "Invalid method" }
    });
});

// Provide a simple GET status page so visiting /mcp in a browser is informative
app.get("/mcp", (req, res) => {
    // Return a JSON-RPC style tools list for browser-based checks (Agent Builder does a GET first)
    res.json({
        jsonrpc: "2.0",
        id: "browser-check",
        result: {
            tools: registeredTools.map((tool) => ({
                name: tool,
                description: "Available MCP tool"
            }))
        }
    });
});

const PORT = parseInt(process.env.PORT || "8080", 10);
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
    console.log(`PazarGlobal MCP Server running on http://${HOST}:${PORT}/mcp`);
    console.log(`Tools loaded: ${registeredTools.join(', ')}`);
});
