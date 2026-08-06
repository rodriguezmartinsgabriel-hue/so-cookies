import type { ListArgs, Paginated } from "../utils"

/**
 * Interface base para todos os repositórios Prisma.
 * Cada repositório concreto implementa este contrato.
 */
export interface Repository<T> {
  findById(id: string): Promise<T | null>
  list(args?: ListArgs): Promise<Paginated<T>>
  create(data: unknown): Promise<T>
  update(id: string, data: unknown): Promise<T>
  delete(id: string): Promise<void>
}
