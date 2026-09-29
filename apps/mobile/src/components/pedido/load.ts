import {
  getClientRating,
  getPaymentForRequest,
  getProfile,
  getProviderRatings,
  getRequest,
  getRequestLocation,
  listQuotes,
  listReviewsForRequest,
  listServicePhotos,
  listWarrantyClaims,
  type Profile,
} from '@helphome/shared';
import { supabase } from '@/lib/supabase';

export const PAID_STATUSES = ['assigned', 'in_progress', 'awaiting_confirmation', 'completed'];

/** Tudo o que a tela do pedido precisa, respeitando o que cada lado pode ver. */
export async function loadRequestDetail(id: string, me: Profile) {
  const request = await getRequest(supabase, id);
  if (!request) return null;
  const isClient = request.client_id === me.id;
  const isChosenProvider = request.provider_id === me.id;
  const isParty = isClient || isChosenProvider;
  const paid = PAID_STATUSES.includes(request.status);
  const completed = request.status === 'completed';

  const [quotes, reviews, photos, claims, payment, otherParty, clientRating, exactLocation] = await Promise.all([
    listQuotes(supabase, id),
    completed && isParty ? listReviewsForRequest(supabase, id) : Promise.resolve([]),
    isParty && paid ? listServicePhotos(supabase, id) : Promise.resolve([]),
    completed && isParty ? listWarrantyClaims(supabase, id) : Promise.resolve([]),
    isParty && request.provider_id ? getPaymentForRequest(supabase, id) : Promise.resolve(null),
    isClient && request.provider_id
      ? getProfile(supabase, request.provider_id)
      : isChosenProvider
        ? getProfile(supabase, request.client_id)
        : Promise.resolve(null),
    isClient ? Promise.resolve(null) : getClientRating(supabase, request.client_id),
    isParty ? getRequestLocation(supabase, id) : Promise.resolve(null),
  ]);
  const ratings = await getProviderRatings(
    supabase,
    quotes.map((q) => q.provider_id),
  );
  return {
    request,
    isClient,
    isChosenProvider,
    isParty,
    paid,
    quotes,
    ratings,
    reviews,
    photos,
    claims,
    payment,
    otherParty,
    clientRating,
    exactLocation,
  };
}

export type RequestDetail = NonNullable<Awaited<ReturnType<typeof loadRequestDetail>>>;
