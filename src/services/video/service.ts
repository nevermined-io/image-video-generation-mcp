/**
 * Video Service Module
 * Handles video and image generation using AI models
 */

/**
 * Response type for media generation operations
 */
export interface MediaGenerationResponse {
  success: boolean;
  message?: string;
  imageUrl?: string;
  url?: string;
}

/**
 * Service for handling video and image generation
 */
export class VideoService {
  private baseUrl: string;
  private accessToken: string;

  /**
   * Creates a new VideoService instance
   * @param baseUrl - Base URL for the video service
   * @param accessToken - Access token for authentication
   */
  constructor(baseUrl: string, accessToken: string) {
    console.error(
      "Creating VideoService instance with baseUrl:",
      baseUrl,
      "and accessToken:",
      accessToken
    );
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  /**
   * Generates an image from a text prompt
   * @param prompt - Text description for the image
   * @returns Promise with the generation result
   */
  public async generateText2Image(
    prompt: string
  ): Promise<MediaGenerationResponse> {
    try {
      console.error(
        "Generating text2image with accessToken:",
        this.accessToken
      );
      const response = await fetch(`${this.baseUrl}/api/generate/text2image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        imageUrl: result.imageUrl,
      };
    } catch (error) {
      console.error("Error in text2image:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Transforms an image based on a text prompt
   * @param inputImageUrl - URL of the image to transform
   * @param prompt - Text description for the transformation
   * @returns Promise with the transformation result
   */
  public async generateImage2Image(
    inputImageUrl: string,
    prompt: string
  ): Promise<MediaGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate/image2image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          inputImageUrl,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        imageUrl: result.imageUrl,
      };
    } catch (error) {
      console.error("Error in image2image:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generates a video from a text prompt
   * @param prompt - Text description for the video
   * @param imageUrls - Optional reference images
   * @param duration - Optional video duration in seconds
   * @returns Promise with the generation result
   */
  public async generateText2Video(
    prompt: string,
    imageUrls?: string[],
    duration?: number
  ): Promise<MediaGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate/text2video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          prompt,
          imageUrls,
          duration,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        url: result.url,
      };
    } catch (error) {
      console.error("Error in text2video:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
