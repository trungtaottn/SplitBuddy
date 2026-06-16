import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FeedActivity, PaginationMeta } from '@/types/api'

interface GetFeedResponse {
  data: FeedActivity[]
  meta: PaginationMeta
}

// Fetch Feed
export const useGetFeed = (limit = 20) => {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      // Offset 0 for now
      return await api.feed.get(limit, 0) as GetFeedResponse 
    }
  })
}

export const useFeed = () => {
  return useQuery({
    queryKey: ['feed'],
    queryFn: async () => {
      return await api.feed.get() as GetFeedResponse
    }
  })
}

// Like Activity
export const useLikeActivity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (activityId: string) => api.feed.toggleLike(activityId),
    onMutate: async (activityId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] })
      const previousFeed = queryClient.getQueryData(['feed'])

      queryClient.setQueryData<GetFeedResponse | undefined>(['feed'], (old) => {
        if (!old) return old
        
        // Optimistically update
        return {
          ...old,
          data: old.data.map((activity) => {
            if (activity.id !== activityId) return activity
            const wasLiked = activity.user_interaction.has_liked
            return {
              ...activity,
              stats: {
                ...activity.stats,
                likes: wasLiked ? activity.stats.likes - 1 : activity.stats.likes + 1,
              },
              user_interaction: {
                ...activity.user_interaction,
                has_liked: !wasLiked,
              },
            }
          }),
        }
      })

      return { previousFeed }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed'], context.previousFeed)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// Add Comment
export const useAddComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ activityId, content }: { activityId: string; content: string }) =>
      api.feed.addComment(activityId, content),
    onSuccess: (_data, variables) => {
      // Invalidate comments for this activity
      queryClient.invalidateQueries({ queryKey: ['comments', variables.activityId] })
      // Also invalidate feed to update comment count
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })
}

// Get Comments
export const useGetComments = (activityId: string) => {
  return useQuery({
    queryKey: ['comments', activityId],
    queryFn: () => api.feed.getComments(activityId),
    enabled: !!activityId,
  })
}
