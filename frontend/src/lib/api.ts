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
}

export { apiWrapper as api }
