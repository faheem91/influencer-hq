export interface Client {
  id: string;
  name: string;
  logo?: string;
  description?: string;

  // Social accounts to track
  tracking: {
    instagram: { handle: string; hashtags: string[]; locations: string[] };
    facebook: { handle: string; hashtags: string[]; locations: string[] };
    tiktok: { handle: string; hashtags: string[] };
  };

  // IMAI integration
  imai: {
    accountId: string;
    campaignId: string;
  };

  // Agent config
  agentId?: string;
  checkInterval: number; // hours (12 for stories, 24 for feed)
  lastChecked?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ClientFormData {
  name: string;
  logo?: string;
  description?: string;
  tracking: {
    instagram: { handle: string; hashtags: string[]; locations: string[] };
    facebook: { handle: string; hashtags: string[]; locations: string[] };
    tiktok: { handle: string; hashtags: string[] };
  };
  imai: {
    accountId: string;
    campaignId: string;
  };
  checkInterval: number;
}

export const defaultClientFormData: ClientFormData = {
  name: "",
  description: "",
  tracking: {
    instagram: { handle: "", hashtags: [], locations: [] },
    facebook: { handle: "", hashtags: [], locations: [] },
    tiktok: { handle: "", hashtags: [] },
  },
  imai: {
    accountId: "",
    campaignId: "",
  },
  checkInterval: 12,
};
