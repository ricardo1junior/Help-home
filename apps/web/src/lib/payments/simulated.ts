import type { PaymentGateway } from "./gateway";

/** Gateway de teste: o pagamento é aprovado numa página interna, sem cobrar nada. */
export const simulatedGateway: PaymentGateway = {
  name: "simulado",
  async createCheckout({ payment }) {
    return `/pagamento/${payment.id}/simulado`;
  },
  async refund() {
    // Nada a devolver: nenhum dinheiro de verdade foi cobrado.
  },
};
