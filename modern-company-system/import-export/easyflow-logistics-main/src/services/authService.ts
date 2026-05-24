import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://modern-system-flame.vercel.app';

export const login = async (username, password) => {
  const response = await axios.post(`${API_URL}/login`, { username, password });
  
  if (response.data.token) {
    // تخزين التوكن في ذاكرة المتصفح عشان نستخدمه بعدين
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  
  return response.data;
};