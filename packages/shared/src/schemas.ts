import { z } from "zod";
import { isValidCnpj, onlyDigits } from "./cnpj";
import { MIN_WARRANTY_DAYS } from "./constants";

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Informe seu nome"),
    email: z.string().trim().email("E-mail inválido"),
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
    phone: z.string().trim().optional(),
    city: z.string().trim().min(2, "Informe sua cidade"),
    role: z.enum(["client", "provider"]),
    cnpj: z
      .string()
      .optional()
      .transform((v) => (v ? onlyDigits(v) : undefined)),
  })
  .refine((v) => v.role !== "provider" || (v.cnpj && isValidCnpj(v.cnpj)), {
    message: "Prestadores precisam informar um CNPJ válido",
    path: ["cnpj"],
  })
  .transform((v) => (v.role === "provider" ? v : { ...v, cnpj: undefined }));
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const newRequestSchema = z.object({
  category_id: z.coerce.number().int().positive("Escolha uma categoria"),
  title: z.string().trim().min(3, "Dê um título curto").max(120),
  description: z.string().trim().min(10, "Descreva o problema com mais detalhes").max(4000),
  address: z.string().trim().min(5, "Informe o endereço"),
  city: z.string().trim().min(2, "Informe a cidade"),
  preferred_date: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
});
export type NewRequestInput = z.input<typeof newRequestSchema>;

export const quoteSchema = z.object({
  price_cents: z.number().int().positive("Informe um valor válido"),
  message: z.string().trim().max(2000).default(""),
  estimated_hours: z.coerce
    .number({ invalid_type_error: "Informe o tempo estimado" })
    .positive("Informe quanto tempo o serviço vai levar")
    .max(2000),
  warranty_days: z.coerce
    .number()
    .int()
    .min(MIN_WARRANTY_DAYS, `A garantia mínima é de ${MIN_WARRANTY_DAYS} dias (Código de Defesa do Consumidor)`)
    .default(MIN_WARRANTY_DAYS),
});
export type QuoteInput = z.input<typeof quoteSchema>;

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(0, "Dê uma nota de 0 a 5").max(5, "Dê uma nota de 0 a 5"),
  comment: z.string().trim().max(2000).default(""),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export const providerProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome"),
  phone: z.string().trim().optional(),
  city: z.string().trim().min(2, "Informe sua cidade"),
  bio: z.string().trim().max(1000).optional(),
  category_ids: z.array(z.coerce.number().int().positive()).min(1, "Escolha pelo menos uma categoria"),
});
export type ProviderProfileInput = z.input<typeof providerProfileSchema>;

export const warrantyClaimSchema = z.object({
  description: z.string().trim().min(10, "Descreva o problema com mais detalhes").max(2000),
});
export type WarrantyClaimInput = z.input<typeof warrantyClaimSchema>;
