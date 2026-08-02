"use client"

import { useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { onDataRefresh } from "@/lib/refresh-events"
import { repository } from "@/lib/repository"
import type { DataEntity, EntityRow } from "@/lib/entity-types"

export { type DataEntity }

export function useQueryData<E extends DataEntity>(entity: E) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [entity],
    queryFn: () => repository[entity].getAll() as Promise<EntityRow<E>[]>,
    staleTime: 30_000,
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [entity] })
  }, [queryClient, entity])

  useEffect(() => {
    return onDataRefresh(invalidate)
  }, [invalidate])

  return {
    data: (query.data ?? []) as EntityRow<E>[],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  }
}
