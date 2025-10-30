import axios, { AxiosInstance, AxiosResponse } from "axios";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";

export interface Block {
  _id: string;
  id?: string;
  blockType: string;
  _doc?: {
    _id: string;
    blockType: string;
    title: string;
    description: string;
    gitUrl?: string;
    [key: string]: any;
  };
  title: string;
  description: string;
  gitUrl?: string;
  courseId?: string;
  courseName?: string;
  allowedBrickTypes: string[];
  allowedBlockTypes?: string[];
  scope: ("library" | "user-store" | "published-store")[];
  content: any[];
  // Fork tracking
  forkedId?: string;
  bundlePath?: string;
  federationUrl?: string;
  buildStatus?: "pending" | "building" | "success" | "failed";
  buildError?: string;
  lastBuilt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBlockRequest {
  blockType: string;
  title: string;
  description: string;
  gitUrl?: string;
  courseId?: string;
  courseName?: string;
  allowedBrickTypes: string[];
  allowedBlockTypes?: string[];
  scope: string[];
  content?: any[];
}

export interface ForkBlockRequest {
  blockId: string;
  title?: string;
  description?: string;
}

export interface SaveAndBundleRequest {
  blockId: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    occupation?: string;
    isProfileComplete: boolean;
  };
}

export interface LoginRequest {
  email: string;
  otp: string;
}

class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private tokenPath: string;

  constructor(baseUrl: string = "https://api.mexty.ai") {
    this.baseUrl = baseUrl;
    this.tokenPath = path.join(os.homedir(), ".mext", "auth.json");

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error(
            chalk.red(
              "Authentication required. Please login first: mexty login"
            )
          );
          this.clearStoredToken();
        } else if (error.response) {
          console.error(
            chalk.red(
              `API Error ${error.response.status}: ${
                error.response.data?.error || error.message
              }`
            )
          );
        } else if (error.request) {
          console.error(
            chalk.red("Network Error: Could not reach MEXT server")
          );
          console.error(
            chalk.yellow(`Make sure the server is running at ${this.baseUrl}`)
          );
        } else {
          console.error(chalk.red(`Request Error: ${error.message}`));
        }
        throw error;
      }
    );
  }

  private getStoredToken(): string | null {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const authData = JSON.parse(fs.readFileSync(this.tokenPath, "utf8"));
        return authData.token || null;
      }
    } catch (error) {
      // Ignore errors reading token file
    }
    return null;
  }

  private storeToken(token: string, user: any): void {
    try {
      const authDir = path.dirname(this.tokenPath);
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      const authData = {
        token,
        user,
        timestamp: new Date().toISOString(),
      };

      fs.writeFileSync(this.tokenPath, JSON.stringify(authData, null, 2));
    } catch (error: any) {
      console.warn(
        chalk.yellow(`Warning: Could not store auth token: ${error.message}`)
      );
    }
  }

  private clearStoredToken(): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
    } catch (error) {
      // Ignore errors clearing token file
    }
  }

  public isAuthenticated(): boolean {
    return this.getStoredToken() !== null;
  }

  public getStoredUser(): any {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const authData = JSON.parse(fs.readFileSync(this.tokenPath, "utf8"));
        return authData.user || null;
      }
    } catch (error) {
      // Ignore errors reading user data
    }
    return null;
  }

  async createBlock(data: CreateBlockRequest): Promise<Block> {
    const response: AxiosResponse<Block> = await this.client.post(
      "/api/blocks",
      data
    );
    return response.data;
  }

  async forkBlock(data: ForkBlockRequest): Promise<Block> {
    const response: AxiosResponse<Block> = await this.client.post(
      "/api/blocks/fork",
      data
    );
    return response.data;
  }

  async deleteBlock(blockId: string): Promise<void> {
    await this.client.delete(`/api/blocks/${blockId}`);
  }

  async getBlock(blockId: string): Promise<Block> {
    const response: AxiosResponse<Block> = await this.client.get(
      `/api/blocks/${blockId}`
    );
    return response.data;
  }

  async saveAndBundle(data: SaveAndBundleRequest): Promise<any> {
    const response = await this.client.post(
      "/api/blocks/save-and-bundle",
      data
    );
    return response.data;
  }

  async updateBlockSharing(blockId: string, scope: string[]): Promise<any> {
    const response = await this.client.patch(`/api/blocks/${blockId}/sharing`, {
      scope,
    });
    return response.data;
  }

  async updateBlockAgentInsertable(
    blockId: string,
    isInsertableByAgent: boolean
  ): Promise<any> {
    const response = await this.client.patch(
      `/api/blocks/${blockId}/agent-insertable`,
      { isInsertableByAgent }
    );
    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/api/health");
      return true;
    } catch (error) {
      return false;
    }
  }

  async requestOTP(email: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.client.post(
      "/api/auth/request-otp",
      { email }
    );
    return response.data;
  }

  async verifyOTP(email: string, otp: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.client.post(
      "/api/auth/verify-otp",
      { email, otp }
    );
    const data = response.data;

    if (data.success && data.token && data.user) {
      this.storeToken(data.token, data.user);
    }

    return data;
  }

  async addBlockToStructure(
    blockId: string,
    parentPath?: string
  ): Promise<any> {
    const response = await this.client.post("/api/structure/add-block", {
      blockId,
      parentPath: parentPath || "/",
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post("/api/auth/logout");
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.clearStoredToken();
    }
  }

  async updateBlockGitUrl(blockId: string, gitUrl?: string, resetToDefault?: boolean): Promise<any> {
    const response = await this.client.patch(`/api/blocks/${blockId}/git-url`, {
      gitUrl,
      resetToDefault,
    });
    return response.data;
  }

  // GitHub OAuth methods
  async getGitHubAuthUrl(): Promise<{ success: boolean; url?: string; message: string }> {
    const response = await this.client.get("/api/auth/github/url");
    return response.data;
  }

  async getGitHubStatus(): Promise<{ success: boolean; connected: boolean; githubUsername?: string; message: string }> {
    const response = await this.client.get("/api/auth/github/status");
    return response.data;
  }

  async getGitHubToken(): Promise<{ success: boolean; token?: string; username?: string; expiresAt?: Date; message?: string; expired?: boolean }> {
    const response = await this.client.get("/api/auth/github/token");
    return response.data;
  }

  async disconnectGitHub(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post("/api/auth/github/disconnect");
    return response.data;
  }

  async checkGitHubInvitationStatus(blockId: string): Promise<{ success: boolean; accepted: boolean; invitationUrl?: string; githubUsername?: string; message?: string }> {
    const response = await this.client.get(`/api/auth/github/invitation-status/${blockId}`);
    return response.data;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
    this.client.defaults.baseURL = url;
  }
}

export const apiClient = new ApiClient();
