import { DebtStats } from '@/types/api';
import api from './axios'

export const apiWrapper = {
    groups: {
        get: (id: string) => api.get(`/groups/${id}`).then((res) => res.data.data),
        archive: (id: string) => api.post(`/groups/${id}/archive`).then((res) => res.data.data),
        restore: (id: string) => api.post(`/groups/${id}/restore`).then((res) => res.data.data),
    },
    inputs: {
        getCategories: () => api.get('/categories').then((res) => res.data.data),
        listBills: (sessionId: string) => api.get(`/sessions/${sessionId}/bills`).then((res) => res.data.data),
        createBill: (sessionId: string, data: any) => api.post(`/sessions/${sessionId}/bills`, data).then((res) => res.data.data),
        updateBill: (sessionId: string, billId: string, data: any) => api.put(`/sessions/${sessionId}/bills/${billId}`, data).then((res) => res.data.data),
        deleteBill: (sessionId: string, billId: string) => api.delete(`/sessions/${sessionId}/bills/${billId}`).then((res) => res.data.data),
    },
    recurring: {
        list: (sessionId: string) => api.get(`/recurring-expenses/session/${sessionId}`).then((res) => res.data),
        pause: (sessionId: string, recurringId: string) =>
            api.put(`/recurring-expenses/session/${sessionId}/${recurringId}/pause`).then((res) => res.data),
        resume: (sessionId: string, recurringId: string) =>
            api.put(`/recurring-expenses/session/${sessionId}/${recurringId}/resume`).then((res) => res.data),
        skip: (sessionId: string, recurringId: string) =>
            api.put(`/recurring-expenses/session/${sessionId}/${recurringId}/skip`).then((res) => res.data),
        listExceptions: (sessionId: string, recurringId: string) =>
            api.get(`/recurring-expenses/session/${sessionId}/${recurringId}/exceptions`).then((res) => res.data),
        addException: (sessionId: string, recurringId: string, data: { date: string; reason?: string }) =>
            api.post(`/recurring-expenses/session/${sessionId}/${recurringId}/exceptions`, data).then((res) => res.data),
        removeException: (sessionId: string, recurringId: string, date: string) =>
            api.delete(`/recurring-expenses/session/${sessionId}/${recurringId}/exceptions/${date}`).then((res) => res.data),
    },
    // Session methods
    getSession: (id: string) => api.get(`/sessions/${id}`).then((res) => res.data.data),
    exportSessionCsv: (id: string) => api.get(`/sessions/${id}/export`, { responseType: 'blob' }),
    exportSessionCsvV2: (id: string) => api.get(`/sessions/${id}/export/v2`, { responseType: 'blob' }),
    importSessionPreview: (id: string, csv: string) =>
        api.post(`/sessions/${id}/import/preview`, { csv }).then((res) => res.data.data),
    importSessionCsv: (id: string, csv: string) =>
        api.post(`/sessions/${id}/import`, { csv }).then((res) => res.data.data),
    whoPaysNext: (id: string) => api.get(`/sessions/${id}/who-pays-next`).then((res) => res.data.data),
    closeSession: (id: string) => api.post(`/sessions/${id}/close`).then((res) => res.data.data),
    reopenSession: (id: string) => api.post(`/sessions/${id}/reopen`).then((res) => res.data.data),
    getDebtStats: async (sessionId: string) => {
    const { data } = await api.get<{ data: DebtStats }>(`/sessions/${sessionId}/debt-stats`);
    return data.data;
  },
    updateMinimizeDebts: (id: string, minimize_debts: boolean) =>
        api.put(`/sessions/${id}/minimize-debts`, { minimize_debts }).then((res) => res.data.data),
    archiveSession: (id: string) => api.post(`/sessions/${id}/archive`).then((res) => res.data.data),
    restoreSession: (id: string) => api.post(`/sessions/${id}/restore`).then((res) => res.data.data),
    deleteSession: (id: string) => api.delete(`/sessions/${id}`).then((res) => res.data.data),
    bulkArchiveSessions: (sessionIds: string[]) =>
        api.post(`/sessions/bulk-archive`, { session_ids: sessionIds }).then((res) => res.data.data),
    addParticipant: (id: string, data: any) => api.post(`/sessions/${id}/participants`, data).then((res) => res.data.data),
    updateParticipant: (id: string, pid: string, data: any) => api.put(`/sessions/${id}/participants/${pid}`, data).then((res) => res.data.data),
    deleteParticipant: (id: string, pid: string) => api.delete(`/sessions/${id}/participants/${pid}`).then((res) => res.data.data),
    fx: {
        rateHistory: (base: string, quote: string, limit = 7) =>
            api.get(`/fx/rates/history`, { params: { base, quote, limit } }).then((res) => res.data.data),
    },
    notifications: {
        list: (params?: { page?: number; limit?: number; unread_only?: boolean }) =>
            api.get('/notifications', { params }).then((res) => res.data.data),
        getUnreadCount: () => api.get('/notifications/unread-count').then((res) => res.data.data),
        markAsRead: (id: string) => api.put(`/notifications/${id}/read`).then((res) => res.data.data),
        markAllAsRead: () => api.post('/notifications/mark-all-read').then((res) => res.data.data),
    },
    personas: {
        getMe: () => api.get('/personas/me').then((res) => res.data.data),
        updateMe: (data: any) => api.put('/personas/me', data).then((res) => res.data.data),
        getAchievements: () => api.get('/personas/achievements').then((res) => res.data.data),
        getMyAchievements: () => api.get('/personas/achievements/me').then((res) => res.data.data),
        checkAchievements: () => api.post('/personas/achievements/check').then((res) => res.data.data),
        getUser: (userId: string) => api.get(`/personas/user/${userId}`).then((res) => res.data.data),
        getLeaderboard: () => api.get('/personas/leaderboard').then((res) => res.data.data),
    },
    feed: {
        get: (limit = 20, offset = 0) => api.get('/feed', { params: { limit, offset } }).then((res) => res.data),
        toggleLike: (activityId: string) => api.post(`/feed/${activityId}/like`).then((res) => res.data.data),
        addComment: (activityId: string, content: string) => api.post(`/feed/${activityId}/comments`, { content }).then((res) => res.data.data),
        getComments: (activityId: string) => api.get(`/feed/${activityId}/comments`).then((res) => res.data.data),
    },
}

export { apiWrapper as api }
