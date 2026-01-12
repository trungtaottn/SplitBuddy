import api from './axios'

export const apiWrapper = {
    groups: {
        get: (id: string) => api.get(`/groups/${id}`).then((res) => res.data),
    },
    inputs: {
        getCategories: () => api.get('/categories').then((res) => res.data),
        listBills: (sessionId: string) => api.get(`/sessions/${sessionId}/bills`).then((res) => res.data),
        createBill: (sessionId: string, data: any) => api.post(`/sessions/${sessionId}/bills`, data).then((res) => res.data),
        updateBill: (sessionId: string, billId: string, data: any) => api.put(`/sessions/${sessionId}/bills/${billId}`, data).then((res) => res.data),
        deleteBill: (sessionId: string, billId: string) => api.delete(`/sessions/${sessionId}/bills/${billId}`).then((res) => res.data),
    },
    // Session methods
    getSession: (id: string) => api.get(`/sessions/${id}`).then((res) => res.data),
    closeSession: (id: string) => api.post(`/sessions/${id}/close`).then((res) => res.data),
    reopenSession: (id: string) => api.post(`/sessions/${id}/reopen`).then((res) => res.data),
    deleteSession: (id: string) => api.delete(`/sessions/${id}`).then((res) => res.data),
    addParticipant: (id: string, data: any) => api.post(`/sessions/${id}/participants`, data).then((res) => res.data),
    updateParticipant: (id: string, pid: string, data: any) => api.put(`/sessions/${id}/participants/${pid}`, data).then((res) => res.data),
    deleteParticipant: (id: string, pid: string) => api.delete(`/sessions/${id}/participants/${pid}`).then((res) => res.data),
}

export { apiWrapper as api }
