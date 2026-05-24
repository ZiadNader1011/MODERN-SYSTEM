import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://modern-system-flame.vercel.app', // عنوان السيرفر بتاعك
});

export const getOrders = async () => {
  const response = await API.get('/get-orders');
  return response.data;
};

// ممكن تضيف هنا دوال تانية زي addOrder