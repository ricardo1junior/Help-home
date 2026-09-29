import { ZodError } from 'zod';

const TRANSLATIONS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar. Enviamos um link para sua caixa de entrada.',
  'User already registered': 'Já existe uma conta com este e-mail.',
  'Database error saving new user': 'Não foi possível criar a conta. Confira os dados (o CNPJ pode já estar cadastrado).',
  'Network request failed': 'Sem conexão. Verifique sua internet.',
};

export function toMessage(err: unknown): string {
  if (err instanceof ZodError) return err.issues[0]?.message ?? 'Dados inválidos.';
  if (err instanceof Error) return TRANSLATIONS[err.message] ?? err.message;
  return 'Algo deu errado. Tente novamente.';
}
