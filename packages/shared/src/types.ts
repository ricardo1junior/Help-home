export type UserRole = "client" | "provider";

export type RequestStatus =
  | "open"
  | "awaiting_payment"
  | "assigned"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "held" | "released" | "refund_pending" | "refunded";
export type PhotoKind = "before" | "after";
export type ClaimStatus = "open" | "resolved";

export type QuoteStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  cnpj: string | null;
  company_name: string | null;
  cnpj_verified: boolean;
  base_lat: number | null;
  base_lng: number | null;
  service_radius_km: number;
  /** Prestador recebendo pedidos novos (avisos de pedidos perto dele). */
  available: boolean;
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
  started_at: string | null;
  finished_at: string | null;
  completed_at: string | null;
  warranty_until: string | null;
  /** Prestador avisou que saiu para o serviço / chegou. */
  en_route_at: string | null;
  arrived_at: string | null;
  /** Ponto aproximado (~1 km), visível para prestadores. */
  approx_lat: number | null;
  approx_lng: number | null;
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
  estimated_hours: number;
  warranty_days: number;
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
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

/** Nota do prestador: média das avaliações menos a penalidade por atrasos. */
export interface ProviderRating {
  provider_id: string;
  average: number;
  reviews_average: number;
  total: number;
  late_jobs: number;
  jobs: number;
}

export interface ClientRating {
  client_id: string;
  average: number;
  total: number;
}

export interface Payment {
  id: string;
  request_id: string;
  quote_id: string;
  client_id: string;
  provider_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  provider_amount_cents: number;
  status: PaymentStatus;
  gateway: string;
  gateway_ref: string | null;
  method: string | null;
  created_at: string;
  paid_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
}

export interface ServicePhoto {
  id: string;
  request_id: string;
  uploaded_by: string;
  kind: PhotoKind;
  url: string;
  created_at: string;
}

export interface WarrantyClaim {
  id: string;
  request_id: string;
  client_id: string;
  description: string;
  status: ClaimStatus;
  created_at: string;
  resolved_at: string | null;
}

type PublicName = Pick<Profile, "id" | "full_name" | "city" | "company_name" | "cnpj_verified">;

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

export interface LatLng {
  lat: number;
  lng: number;
}

export type NearbyRequest = ServiceRequestWithCategory & {
  distance_km: number | null;
  already_quoted: boolean;
};

export type NotificationKind =
  | "new_request"
  | "new_quote"
  | "quote_accepted"
  | "quote_rejected"
  | "paid"
  | "en_route"
  | "arrived"
  | "started"
  | "finished"
  | "completed"
  | "cancelled"
  | "message"
  | "review"
  | "warranty";

export interface AppNotification {
  id: string;
  user_id: string;
  request_id: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

/** Posição ao vivo do prestador a caminho do serviço. */
export interface ProviderTracking {
  request_id: string;
  provider_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  updated_at: string;
}

/** Perfil público do prestador, com nota e avaliações. */
export interface ProviderPublicProfile {
  profile: Pick<Profile, "id" | "full_name" | "company_name" | "city" | "bio" | "cnpj_verified" | "created_at">;
  rating: ProviderRating | null;
  categories: Category[];
  reviews: Review[];
}
