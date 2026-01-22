export interface InstagramPost {
  id: string;
  username: string;
  fullName?: string;
  profilePicUrl?: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL";
  mediaUrl: string;
  thumbnailUrl?: string;
  likes: number;
  comments: number;
  timestamp: string;
  permalink?: string;
}

export interface InstagramUser {
  id: string;
  username: string;
  fullName?: string;
  profilePicUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isVerified?: boolean;
}

export interface InstagramSearchResult {
  posts: InstagramPost[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TrackedCreator {
  id: string;
  clientId: string;
  username: string;
  fullName?: string;
  profilePicUrl?: string;
  platform: "instagram" | "facebook" | "tiktok";
  sourceType: "mention" | "hashtag" | "location" | "story";
  sourceValue: string;
  discoveredAt: string;
  addedToImai: boolean;
  imaiAddedAt?: string;
  postId?: string;
  postCaption?: string;
  postMediaUrl?: string;
  engagement?: {
    likes: number;
    comments: number;
  };
}
