import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});


export const fetchJobs = () => API.get("/get-jobs");

export const createJob = (data: any) => API.post("/add-job", data);

export const updateJob = (id: string, data: any) =>
  API.put(`/update-job/${id}`, data);

export const deleteJob = (id: string) =>
  API.delete(`/delete-job/${id}`);