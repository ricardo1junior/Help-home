-- Novos status do pedido. Ficam numa migração separada porque o Postgres
-- só permite usar um valor novo de enum depois que ele foi confirmado.
alter type public.request_status add value 'awaiting_payment' after 'open';
alter type public.request_status add value 'awaiting_confirmation' after 'in_progress';
