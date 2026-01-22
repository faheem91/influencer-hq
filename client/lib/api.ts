import { InstagramSearchResult } from "@/types/instagram";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Instagram endpoints
  async searchInstagram(
    keyword: string,
    page: number = 1,
    limit: number = 10
  ): Promise<InstagramSearchResult> {
    const params = new URLSearchParams({
      keyword,
      page: page.toString(),
      limit: limit.toString(),
    });
    return this.fetch(`/api/instagram/search?${params}`);
  }

  async searchInstagramAll(keyword: string): Promise<InstagramSearchResult> {
    const params = new URLSearchParams({ keyword });
    return this.fetch(`/api/instagram/search/all?${params}`);
  }

  async testInstagramConnection(): Promise<{ success: boolean; message: string }> {
    return this.fetch("/api/instagram/test");
  }

  async getInstagramAccount(): Promise<{ username: string; fullName: string }> {
    return this.fetch("/api/instagram/account");
  }

  async logoutInstagram(): Promise<{ success: boolean }> {
    return this.fetch("/api/instagram/logout", { method: "POST" });
  }
}

export const api = new ApiClient(API_BASE_URL);
