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
    // Session methods
    getSession: (id: string) => api.get(`/sessions/${id}`).then((res) => res.data.data),
    closeSession: (id: string) => api.post(`/sessions/${id}/close`).then((res) => res.data.data),
    reopenSession: (id: string) => api.post(`/sessions/${id}/reopen`).then((res) => res.data.data),
    updateMinimizeDebts: (id: string, minimize_debts: boolean) =>
        api.put(`/sessions/${id}/minimize-debts`, { minimize_debts }).then((res) => res.data.data),
    archiveSession: (id: string) => api.post(`/sessions/${id}/archive`).then((res) => res.data.data),
    restoreSession: (id: string) => api.post(`/sessions/${id}/restore`).then((res) => res.data.data),
    deleteSession: (id: string) => api.delete(`/sessions/${id}`).then((res) => res.data.data),
    addParticipant: (id: string, data: any) => api.post(`/sessions/${id}/participants`, data).then((res) => res.data.data),
    updateParticipant: (id: string, pid: string, data: any) => api.put(`/sessions/${id}/participants/${pid}`, data).then((res) => res.data.data),
    deleteParticipant: (id: string, pid: string) => api.delete(`/sessions/${id}/participants/${pid}`).then((res) => res.data.data),
}

export { apiWrapper as api }
