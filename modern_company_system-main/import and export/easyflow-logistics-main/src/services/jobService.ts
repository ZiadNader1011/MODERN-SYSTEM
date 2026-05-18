import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const jobService = {
  getJobs: async () => {
    const res = await API.get('/jobs');
    return res.data;
  },

  createJob: async (data: any) => {
    const res = await API.post('/jobs', data);
    return res.data;
  },

  updateJob: async (id: string, data: any) => {
    const res = await API.put(`/jobs/${id}`, data);
    return res.data;
  },

  deleteJob: async (id: string) => {
    const res = await API.delete(`/jobs/${id}`);
    return res.data;
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await API.post('/upload', formData);

    return res.data;
  },
};