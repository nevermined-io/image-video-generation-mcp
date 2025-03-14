/**
 * Nevermined Payment Management Module
 * Handles payment initialization, balance checking and plan purchases
 */

import { EnvironmentName, Payments } from "@nevermined-io/payments";
import { VideoService } from "../video/index.js";
import { NEVERMINED_CONFIG } from "./config.js";

/**
 * Service access configuration type
 */
interface ServiceAccessConfig {
  neverminedProxyUri: string;
  accessToken: string;
}

/**
 * Manages all Nevermined payment and service access operations
 */
export class PaymentsManager {
  private payments: Payments;
  private static instance: PaymentsManager;

  private constructor() {
    console.error("Creating PaymentsManager instance");
    this.payments = Payments.getInstance({
      nvmApiKey: NEVERMINED_CONFIG.API_KEY,
      environment: NEVERMINED_CONFIG.ENVIRONMENT as EnvironmentName,
    });
  }

  /**
   * Gets the singleton instance of PaymentsManager
   */
  public static getInstance(): PaymentsManager {
    console.error("Getting instance of PaymentsManager");
    if (!PaymentsManager.instance) {
      PaymentsManager.instance = new PaymentsManager();
    }
    return PaymentsManager.instance;
  }

  /**
   * Checks if there are sufficient credits for the specified agent
   * @param planDid - DID of the plan to check
   * @param agentDid - DID of the agent to check
   * @returns Promise<boolean> indicating if there are sufficient credits
   */
  public async checkBalance(
    planDid: string,
    agentDid: string
  ): Promise<boolean> {
    try {
      console.error("Checking balance");
      const balanceResult = await this.payments.getPlanBalance(planDid);
      const agentDDO = await this.payments.getAssetDDO(agentDid);
      const minRequired = this.extractRequiredBalance(agentDDO);
      console.error("Balance result:", balanceResult);
      console.error("Min required:", minRequired);
      return Number(balanceResult.balance) >= minRequired;
    } catch (error) {
      console.error("Error checking balance:", error);
      return false;
    }
  }

  /**
   * Orders a new subscription plan
   * @param planDid - DID of the plan to purchase
   * @returns Promise with the purchase result
   */
  public async orderPlan(
    planDid: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.error("What's in this.payments?");
      console.error(this.payments);
      console.error(planDid);
      const purchaseResult = await this.payments.orderPlan(planDid);

      if (!purchaseResult || !purchaseResult.success) {
        return {
          success: false,
          message: "Failed to create order",
        };
      }

      return {
        success: true,
        message: `Plan ordered successfully. Agreement ID: ${purchaseResult.agreementId}`,
      };
    } catch (error) {
      console.error("Error ordering plan:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Gets service access configuration for an agent
   * @param agentDid - DID of the agent to get access for
   * @returns Promise<ServiceAccessConfig> - Access configuration for the service
   */
  public async getServiceAccess(
    agentDid: string
  ): Promise<ServiceAccessConfig> {
    try {
      console.error("Getting service access for agent:", agentDid);
      const accessConfig = await this.payments.query.getServiceAccessConfig(
        agentDid
      );

      if (!accessConfig || !accessConfig.accessToken) {
        throw new Error("Failed to get service access configuration");
      }

      return {
        neverminedProxyUri: accessConfig.neverminedProxyUri.replace(
          "https",
          "http"
        ),
        accessToken: accessConfig.accessToken,
      };
    } catch (error) {
      console.error("Error getting service access:", error);
      throw error;
    }
  }

  /**
   * Gets a configured VideoService instance with proper authentication
   * @param agentDid - DID of the agent to get service for
   * @returns Promise<VideoService> - Configured video service instance
   */
  public async getVideoService(agentDid: string): Promise<VideoService> {
    console.error("Getting video service");
    const accessConfig = await this.getServiceAccess(agentDid);
    console.error("Access config:", accessConfig);
    return new VideoService(
      accessConfig.neverminedProxyUri,
      accessConfig.accessToken
    );
  }

  /**
   * Extracts the required minimum balance from a DDO
   * @param ddo - The DDO object to extract from
   * @returns number - The minimum required balance
   */
  private extractRequiredBalance(ddo: any): number {
    return (
      ddo?.service?.[2]?.attributes?.main?.nftAttributes?.minCreditsRequired ||
      0
    );
  }
}
