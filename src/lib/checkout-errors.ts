export function checkoutErrorMessage(code: string | null | undefined, fallback: string): string {
  switch (code) {
    case "NO_PAYER_EMAIL":
      return "Cadastre um e-mail no seu perfil para poder pagar via PIX."
    case "PAYMENTS_DISABLED":
      return "O pagamento online está temporariamente indisponível. Tente novamente em alguns minutos."
    case "PRICE_CHANGED":
      return "O valor do pedido mudou. Revise o carrinho e tente novamente."
    case "INVALID_AMOUNT":
      return "O valor do pedido é inválido. Entre em contato com o suporte."
    case "PROVIDER_AUTH_ERROR":
    case "PROVIDER_ERROR":
      return "Não foi possível processar o pagamento no momento. Tente novamente em instantes."
    default:
      return fallback
  }
}
