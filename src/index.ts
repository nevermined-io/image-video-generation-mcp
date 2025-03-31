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
import { VideoService } from "./services/video/index.js";
import {
  NeverminedMCP,
  NeverminedConfig,
} from "@nevermined-io/mcp-payments-library";
import fetch from "node-fetch";
import axios from "axios";

// Make fetch available globally for the MCP SDK
// @ts-ignore
global.fetch = fetch;

const neverminedConfig: NeverminedConfig = {
  apiKey: process.env.NVM_API_KEY!,
  environment: "testing",
  planDid:
    "did:nv:bbc5556a932bdeb88bbe45045530e491ad428b351fb43c8bd4be04dba7878a3d",
  agentDid:
    "did:nv:2fa0a0c9ec6cd923827fe3657298ac9d8cd8cafb07120b10e94b2a26d962a793",
};

// Initialize Nevermined library
const neverminedMCP = new NeverminedMCP(neverminedConfig);

// Initialize MCP server
const server = new McpServer({
  name: "video-generation",
  version: "1.0.0",
});

/**
 * Utility function to download media and convert to base64
 * @param url - URL of the media to download
 * @returns Promise resolving to base64 string or null if file is too large
 */
async function downloadAsBase64(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const contentLength = parseInt(response.headers["content-length"] || "0");

    // If file is larger than 1MB, return null to indicate URL should be used instead
    if (contentLength > 1024 * 1024) {
      return null;
    }

    const base64 = Buffer.from(response.data).toString("base64");
    return base64;
  } catch (error) {
    console.error("Error downloading media:", error);
    return null;
  }
}

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
      const purchaseResult = await neverminedMCP.purchasePlan(planDid);

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
 */
server.tool(
  "text2image",
  "Generate an image from a text prompt",
  {
    prompt: z.string().min(1).describe("Text prompt for image generation"),
  },
  async ({ prompt }: { prompt: string }) => {
    // Check balance
    const hasBalance = await neverminedMCP.checkBalance(
      neverminedConfig.planDid,
      neverminedConfig.agentDid
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
              { planDid: neverminedConfig.planDid },
              null,
              2
            ),
          },
        ],
        metadata: {
          needsPurchase: true,
          planDid: neverminedConfig.planDid,
        },
      };
    }

    // Get service access configuration
    const accessConfig = await neverminedMCP.getServiceAccess(
      neverminedConfig.agentDid
    );
    const videoService = new VideoService(
      accessConfig.neverminedProxyUri,
      accessConfig.accessToken
    );

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

    // Download and convert image to base64 if not too large
    const imageBase64 = await downloadAsBase64(result.imageUrl);

    return {
      content: [
        imageBase64
          ? {
              type: "image",
              data: imageBase64,
              mimeType: "image/png",
            }
          : {
              type: "resource",
              resource: {
                uri: result.imageUrl,
                text: "Generated image",
                mimeType: "image/png",
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
      const hasBalance = await neverminedMCP.checkBalance(
        neverminedConfig.planDid,
        neverminedConfig.agentDid
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
                { planDid: neverminedConfig.planDid },
                null,
                2
              ),
            },
          ],
          metadata: {
            needsPurchase: true,
            planDid: neverminedConfig.planDid,
          },
        };
      }

      // Get service access configuration
      const accessConfig = await neverminedMCP.getServiceAccess(
        neverminedConfig.agentDid
      );
      const videoService = new VideoService(
        accessConfig.neverminedProxyUri,
        accessConfig.accessToken
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

      // Download and convert transformed image if not too large
      const imageBase64 = await downloadAsBase64(result.imageUrl);

      return {
        content: [
          imageBase64
            ? {
                type: "image",
                data: imageBase64,
                mimeType: "image/png",
              }
            : {
                type: "resource",
                resource: {
                  uri: result.imageUrl,
                  text: "Transformed image",
                  mimeType: "image/png",
                },
              },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error in image transformation: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
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
    const hasBalance = await neverminedMCP.checkBalance(
      neverminedConfig.planDid,
      neverminedConfig.agentDid
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
              { planDid: neverminedConfig.planDid },
              null,
              2
            ),
          },
        ],
        metadata: {
          needsPurchase: true,
          planDid: neverminedConfig.planDid,
        },
      };
    }

    // Get service access configuration
    const accessConfig = await neverminedMCP.getServiceAccess(
      neverminedConfig.agentDid
    );
    const videoService = new VideoService(
      accessConfig.neverminedProxyUri,
      accessConfig.accessToken
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

    // Videos are typically large, so we'll always return the URL
    return {
      content: [
        {
          type: "resource",
          resource: {
            uri: result.url,
            text: "Generated video",
            mimeType: "video/mp4",
          },
        },
      ],
    };
  }
);

/**
 * Main function to start the MCP server
 */
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Error starting MCP server:", error);
    process.exit(1);
  }
}

main();
