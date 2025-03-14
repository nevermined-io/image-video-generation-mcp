/**
 * Nevermined Configuration Module
 * Contains all configuration constants and environment settings for Nevermined services
 */

/**
 * Environment configuration for Nevermined services
 */
export const NEVERMINED_CONFIG = {
  /** API Key for accessing Nevermined services */
  API_KEY: process.env.NVM_API_KEY,

  /** Environment to use (testing, staging, production) */
  ENVIRONMENT: "testing" as const,

  /** DID for the subscription plan */
  PLAN_DID:
    "did:nv:bbc5556a932bdeb88bbe45045530e491ad428b351fb43c8bd4be04dba7878a3d",

  /** DID for the agent accessing the services */
  AGENT_DID:
    "did:nv:2fa0a0c9ec6cd923827fe3657298ac9d8cd8cafb07120b10e94b2a26d962a793",
} as const;

/**
 * Validates that all required environment variables are set
 * @throws Error if any required variable is missing
 */
export function validateConfig(): void {
  if (!NEVERMINED_CONFIG.API_KEY) {
    throw new Error("NVM_API_KEY is not set");
  }
}
