export type UserRole = "client" | "provider";

export type RequestStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type QuoteStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  category_id: number;
  title: string;
  description: string;
  address: string;
  city: string;
  preferred_date: string | null;
  photos: string[];
  status: RequestStatus;
  provider_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  request_id: string;
  provider_id: string;
  price_cents: number;
  message: string;
  status: QuoteStatus;
  created_at: string;
}

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Review {
  id: string;
  request_id: string;
  client_id: string;
  provider_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ProviderRating {
  provider_id: string;
  average: number;
  total: number;
}

type PublicName = Pick<Profile, "id" | "full_name" | "city">;

export type ServiceRequestWithCategory = ServiceRequest & {
  category: Category;
};

export type ServiceRequestDetail = ServiceRequestWithCategory & {
  client: PublicName;
  provider: PublicName | null;
};

export type QuoteWithProvider = Quote & {
  provider: PublicName;
};
