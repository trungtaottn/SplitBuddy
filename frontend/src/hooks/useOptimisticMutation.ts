import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from '@/components/ui/toaster'
import { triggerHaptic } from './useHaptic'

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>
  queryKey: unknown[]
  onMutate?: (variables: TVariables) => TData | undefined
  updateCache?: (oldData: TData | undefined, variables: TVariables) => TData
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables, context: TData | undefined) => void
  successMessage?: string
  errorMessage?: string
}

export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  queryKey,
  onMutate,
  updateCache,
  onSuccess,
  onError,
  successMessage,
  errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.',
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (variables: TVariables) => {
    setIsPending(true)
    setError(null)

    // Get current data for rollback
    const previousData = queryClient.getQueryData<TData>(queryKey)

    // Optimistically update cache
    if (updateCache) {
      queryClient.setQueryData<TData>(queryKey, (old) => updateCache(old, variables))
      triggerHaptic('tap')
    } else if (onMutate) {
      const optimisticData = onMutate(variables)
      if (optimisticData) {
        queryClient.setQueryData<TData>(queryKey, optimisticData)
        triggerHaptic('tap')
      }
    }

    try {
      const result = await mutationFn(variables)
      
      // Update with actual server data
      queryClient.setQueryData<TData>(queryKey, result)
      
      // Success feedback
      triggerHaptic('success')
      if (successMessage) {
        toast.success(successMessage)
      }
      
      onSuccess?.(result, variables)
      setIsPending(false)
      
      return result
    } catch (err) {
      // Rollback on error
      queryClient.setQueryData<TData>(queryKey, previousData)
      
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      
      // Error feedback
      triggerHaptic('error')
      toast.error(errorMessage)
      
      onError?.(error, variables, previousData)
      setIsPending(false)
      
      throw error
    }
  }, [queryClient, queryKey, mutationFn, updateCache, onMutate, onSuccess, onError, successMessage, errorMessage])

  return {
    mutate,
    mutateAsync: mutate,
    isPending,
    error,
    reset: () => setError(null),
  }
}

// Specific optimistic hooks for common operations

// Optimistic update for adding item to list
export function useOptimisticAdd<TItem extends { id: string }, TCreate>(options: {
  queryKey: unknown[]
  mutationFn: (data: TCreate) => Promise<TItem>
  createOptimisticItem: (data: TCreate) => TItem
  successMessage?: string
}) {
  return useOptimisticMutation<TItem[], TCreate>({
    queryKey: options.queryKey,
    mutationFn: async (data) => {
      const result = await options.mutationFn(data)
      return [result] // Return as array for type compatibility
    },
    updateCache: (oldData, variables) => {
      const optimisticItem = options.createOptimisticItem(variables)
      return [...(oldData || []), optimisticItem]
    },
    successMessage: options.successMessage,
  })
}

// Optimistic update for removing item from list
export function useOptimisticDelete<TItem extends { id: string }>(options: {
  queryKey: unknown[]
  mutationFn: (id: string) => Promise<void>
  successMessage?: string
}) {
  return useOptimisticMutation<TItem[], string>({
    queryKey: options.queryKey,
    mutationFn: async (id) => {
      await options.mutationFn(id)
      return [] // Return empty for type compatibility
    },
    updateCache: (oldData, id) => {
      return (oldData || []).filter(item => item.id !== id)
    },
    successMessage: options.successMessage,
  })
}

// Optimistic toggle (like/unlike, complete/incomplete)
export function useOptimisticToggle<TItem extends { id: string }>(options: {
  queryKey: unknown[]
  mutationFn: (id: string, currentState: boolean) => Promise<TItem>
  getToggleState: (item: TItem) => boolean
  setToggleState: (item: TItem, state: boolean) => TItem
}) {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState<string | null>(null)

  const toggle = useCallback(async (id: string) => {
    setIsPending(id)
    
    const previousData = queryClient.getQueryData<TItem[]>(options.queryKey)
    const currentItem = previousData?.find(item => item.id === id)
    
    if (!currentItem) {
      setIsPending(null)
      return
    }

    const currentState = options.getToggleState(currentItem)

    // Optimistic update
    queryClient.setQueryData<TItem[]>(options.queryKey, (old) =>
      old?.map(item =>
        item.id === id ? options.setToggleState(item, !currentState) : item
      )
    )
    triggerHaptic('toggle')

    try {
      const result = await options.mutationFn(id, currentState)
      
      // Update with server response
      queryClient.setQueryData<TItem[]>(options.queryKey, (old) =>
        old?.map(item => item.id === id ? result : item)
      )
      
      triggerHaptic('success')
    } catch {
      // Rollback
      queryClient.setQueryData<TItem[]>(options.queryKey, previousData)
      triggerHaptic('error')
      toast.error('Có lỗi xảy ra')
    } finally {
      setIsPending(null)
    }
  }, [queryClient, options])

  return {
    toggle,
    isPending,
    isPendingFor: (id: string) => isPending === id,
  }
}

