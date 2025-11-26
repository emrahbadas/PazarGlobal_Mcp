import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
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

// Set up Express server
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
    // Quick JSON-RPC handler for Agent Builder compatibility (tools discovery)
    const body = req.body || {};
    const { method, id, params } = body;

    if (method === "tools/list") {
        return res.json({
            jsonrpc: "2.0",
            id,
            result: {
                tools: [
                    {
                        name: "clean_price",
                        description: "Convert messy price text into a structured clean price.",
                        parameters: {
                            type: "object",
                            properties: {
                                price_text: {
                                    type: "string",
                                    description: "Raw price text (e.g. '12 bin TL')"
                                }
                            },
                            required: ["price_text"]
                        }
                    },
                    {
                        name: "insert_listing",
                        description: "Insert product listing into Supabase.",
                        parameters: {
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
                                "product_name",
                                "brand",
                                "condition",
                                "category",
                                "description",
                                "original_price_text",
                                "clean_price"
                            ]
                        }
                    }
                ]
            }
        });
    }

    if (method === "tools/call") {
        // Expecting params: { name: string, arguments: { ... } }
        const params = req.body.params || {};
        const toolName = params.name || params.tool || params.toolName;
        const toolArgs = params.arguments || params.params || {};

        try {
            if (toolName === "clean_price") {
                const result = await cleanPrice(toolArgs);
                return res.json({ jsonrpc: "2.0", id, result });
            }

            if (toolName === "insert_listing") {
                const result = await insertListing(toolArgs);
                return res.json({ jsonrpc: "2.0", id, result });
            }

            return res.json({
                jsonrpc: "2.0",
                id,
                error: { message: `Unknown tool: ${toolName}` }
            });
        } catch (err) {
            return res.json({
                jsonrpc: "2.0",
                id,
                error: { message: err?.message || String(err) }
            });
        }
    }

    // Fallback to full MCP Streamable HTTP transport for other requests
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on("close", () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

// Provide a simple GET status page so visiting /mcp in a browser is informative
app.get("/mcp", (req, res) => {
    // Return a JSON-RPC style tools list for browser-based checks (Agent Builder does a GET first)
    res.json({
        jsonrpc: "2.0",
        id: "browser-check",
        result: {
            tools: [
                {
                    name: "clean_price",
                    description: "Convert messy price text into a structured clean price.",
                    parameters: {
                        type: "object",
                        properties: {
                            price_text: { type: "string", description: "Raw price text (e.g. '12 bin TL')" }
                        },
                        required: ["price_text"]
                    }
                },
                {
                    name: "insert_listing",
                    description: "Insert product listing into Supabase.",
                    parameters: {
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
                            "product_name",
                            "brand",
                            "condition",
                            "category",
                            "description",
                            "original_price_text",
                            "clean_price"
                        ]
                    }
                }
            ]
        }
    });
});

const PORT = parseInt(process.env.PORT || process.env.MCP_PORT || "7777");
const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
    console.log(`PazarGlobal MCP Server running on http://${HOST}:${PORT}/mcp`);
    console.log(`Tools loaded: ${registeredTools.join(', ')}`);
}).on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
});
