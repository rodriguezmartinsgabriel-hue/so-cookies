export type LoyaltyTxTypeString = "EARN" | "REDEEM" | "REFUND" | "ADJUSTMENT" | "EXPIRE"

export interface LoyaltyBalanceView {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
}

export interface LoyaltyTransactionView {
  id: string
  type: LoyaltyTxTypeString
  points: number
  balanceAfter: number
  reason: string
  orderId: string | null
  createdAt: string
}

export interface LoyaltyRewardView {
  id: string
  name: string
  description: string | null
  image: string | null
  pointsCost: number
  type: "DISCOUNT_FIXED" | "DISCOUNT_PERCENTAGE" | "FREE_PRODUCT" | "FREE_SHIPPING"
  enabled: boolean
  stock: number | null
}

export class LoyaltyError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = "LoyaltyError"
  }
}
