/**
 * MCP Server for video and image generation
 * This server provides tools for generating images and videos using AI models.
 * It integrates with Nevermined's payment system for credit management and authentication.
 *
 * @module index
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  PaymentsManager,
  NEVERMINED_CONFIG,
  validateConfig,
} from "./services/nevermined/index.js";
import fetch from "node-fetch";
import axios from "axios";

// Make fetch available globally for the MCP SDK
// @ts-ignore
global.fetch = fetch;

// Validate Nevermined configuration
validateConfig();

// Initialize MCP server with metadata
const server = new McpServer({
  name: "video-generation",
  version: "1.0.0",
});

// Initialize PaymentsManager
const paymentsManager = PaymentsManager.getInstance();

/**
 * Tool for purchasing a subscription plan
 * Handles the purchase flow for Nevermined credits
 */
server.tool(
  "purchase_plan",
  "Purchase a subscription plan for media generation",
  {
    planDid: z.string().describe("DID of the plan to purchase"),
  },
  async ({ planDid }: { planDid: string }) => {
    try {
      const purchaseResult = await paymentsManager.orderPlan(planDid);

      if (!purchaseResult.success) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error purchasing plan: ${
                purchaseResult.message || "Unknown error"
              }`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text:
              purchaseResult.message ||
              "Plan purchased successfully. You can now generate media.",
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error in plan purchase: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

/**
 * Tool for generating images from text prompts
 * Uses AI models to create images based on textual descriptions
 * Includes credit checking and authentication via Nevermined
 */
server.tool(
  "text2image",
  "Generate an image from a text prompt",
  {
    prompt: z.string().min(1).describe("Text prompt for image generation"),
  },
  async ({ prompt }: { prompt: string }) => {
    // Check balance
    const hasBalance = await paymentsManager.checkBalance(
      NEVERMINED_CONFIG.PLAN_DID,
      NEVERMINED_CONFIG.AGENT_DID
    );

    if (!hasBalance) {
      return {
        content: [
          {
            type: "text",
            text: "Insufficient credits. Please purchase a plan using the purchase_plan tool with the following parameters:",
          },
          {
            type: "text",
            text: JSON.stringify(
              { planDid: NEVERMINED_CONFIG.PLAN_DID },
              null,
              2
            ),
          },
        ],
        metadata: {
          needsPurchase: true,
          planDid: NEVERMINED_CONFIG.PLAN_DID,
        },
      };
    }

    console.error("Getting video service instance");
    // Get video service instance
    const videoService = await paymentsManager.getVideoService(
      NEVERMINED_CONFIG.AGENT_DID
    );

    console.error("Generating image");
    // Generate the image
    const result = await videoService.generateText2Image(prompt);

    if (!result.success || !result.imageUrl) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error generating image: ${
              result.message || "No image URL returned"
            }`,
          },
        ],
      };
    }

    // Download and convert image to base64 for direct display
    const imageBase64 = await downloadAsBase64(result.imageUrl);

    return {
      content: [
        {
          type: "resource",
          resource: imageBase64
            ? {
                uri: result.imageUrl,
                blob: imageBase64,
                mimeType: "image/jpeg",
              }
            : {
                uri: result.imageUrl,
                text: "Image too large to display directly",
                mimeType: "image/jpeg",
              },
        },
      ],
    };
  }
);

/**
 * Tool for transforming existing images using AI
 * Takes an input image and a text prompt to guide the transformation
 */
server.tool(
  "image2image",
  "Transform an image based on a text prompt",
  {
    inputImageUrl: z.string().url().describe("URL of the input image"),
    prompt: z.string().min(1).describe("Text prompt for transformation"),
  },
  async ({
    inputImageUrl,
    prompt,
  }: {
    inputImageUrl: string;
    prompt: string;
  }) => {
    try {
      // Check balance
      const hasBalance = await paymentsManager.checkBalance(
        NEVERMINED_CONFIG.PLAN_DID,
        NEVERMINED_CONFIG.AGENT_DID
      );

      if (!hasBalance) {
        return {
          content: [
            {
              type: "text",
              text: "Insufficient credits. Please purchase a plan using the purchase_plan tool with the following parameters:",
            },
            {
              type: "text",
              text: JSON.stringify(
                { planDid: NEVERMINED_CONFIG.PLAN_DID },
                null,
                2
              ),
            },
          ],
          metadata: {
            needsPurchase: true,
            planDid: NEVERMINED_CONFIG.PLAN_DID,
          },
        };
      }

      // Get video service instance
      const videoService = await paymentsManager.getVideoService(
        NEVERMINED_CONFIG.AGENT_DID
      );

      // Transform the image
      const result = await videoService.generateImage2Image(
        inputImageUrl,
        prompt
      );

      if (!result.success || !result.imageUrl) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error transforming image: ${
                result.message || "No image URL returned"
              }`,
            },
          ],
        };
      }

      // Download and convert transformed image
      const imageBase64 = await downloadAsBase64(result.imageUrl);

      return {
        content: [
          {
            type: "resource",
            resource: imageBase64
              ? {
                  uri: result.imageUrl,
                  blob: imageBase64,
                  mimeType: "image/jpeg",
                }
              : {
                  uri: result.imageUrl,
                  text: "Image too large to display directly",
                  mimeType: "image/jpeg",
                },
          },
        ],
      };
    } catch (error) {
      console.error("Error transforming image:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Error transforming image" }],
      };
    }
  }
);

/**
 * Tool for generating videos from text descriptions
 * Optionally accepts reference images and duration parameters
 */
server.tool(
  "text2video",
  "Generate a video from a text prompt",
  {
    prompt: z.string().min(1).describe("Text prompt for video generation"),
    imageUrls: z
      .array(z.string().url())
      .optional()
      .describe("Optional array of reference image URLs"),
    duration: z
      .number()
      .positive()
      .optional()
      .describe("Optional duration in seconds"),
  },
  async ({
    prompt,
    imageUrls,
    duration,
  }: {
    prompt: string;
    imageUrls?: string[];
    duration?: number;
  }) => {
    // Check balance
    const hasBalance = await paymentsManager.checkBalance(
      NEVERMINED_CONFIG.PLAN_DID,
      NEVERMINED_CONFIG.AGENT_DID
    );

    if (!hasBalance) {
      return {
        content: [
          {
            type: "text",
            text: "Insufficient credits. Please purchase a plan using the purchase_plan tool with the following parameters:",
          },
          {
            type: "text",
            text: JSON.stringify(
              { planDid: NEVERMINED_CONFIG.PLAN_DID },
              null,
              2
            ),
          },
        ],
        metadata: {
          needsPurchase: true,
          planDid: NEVERMINED_CONFIG.PLAN_DID,
        },
      };
    }

    // Get video service instance
    const videoService = await paymentsManager.getVideoService(
      NEVERMINED_CONFIG.AGENT_DID
    );

    // Generate the video
    const result = await videoService.generateText2Video(
      prompt,
      imageUrls,
      duration
    );

    if (!result.success || !result.url) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error generating video: ${
              result.message || "No video URL returned"
            }`,
          },
        ],
      };
    }

    const videoBase64 = await downloadAsBase64(result.url);

    return {
      content: [
        {
          type: "resource",
          resource: videoBase64
            ? {
                uri: result.url,
                blob: videoBase64,
                mimeType: "video/mp4",
              }
            : {
                uri: result.url,
                text: "Video too large to display directly",
                mimeType: "video/mp4",
              },
        },
      ],
    };
  }
);

/**
 * Utility function to download media content and convert it to base64
 * Supports both images and videos. If content is larger than 1MB, returns null
 *
 * @param url - The URL of the media to download
 * @returns Promise with the base64 encoded string of the media content or null if too large
 */
async function downloadAsBase64(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // Check if content is larger than 1MB
    if (response.data.byteLength > 1024 * 1024) {
      console.error("Content is larger than 1MB, skipping base64 conversion");
      return null;
    }

    return Buffer.from(response.data, "binary").toString("base64");
  } catch (error) {
    console.error("Error downloading media:", error);
    throw error;
  }
}

/**
 * Main function to initialize and start the MCP server
 * Sets up stdio transport for communication
 */
async function main(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Video Generation MCP Server running on stdio");
  } catch (error: unknown) {
    console.error(
      "Error starting server:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
