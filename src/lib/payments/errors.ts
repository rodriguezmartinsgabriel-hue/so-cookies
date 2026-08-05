export class PaymentError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "PaymentError"
    this.code = code
  }
}
