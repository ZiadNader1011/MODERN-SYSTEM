import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000', // عنوان السيرفر بتاعك
});

export const getOrders = async () => {
  const response = await API.get('/get-orders');
  return response.data;
};

// ممكن تضيف هنا دوال تانية زي addOrder