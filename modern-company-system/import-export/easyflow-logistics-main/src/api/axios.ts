import axios from "axios";

const api = axios.create({
  // ضع رابط الباك اند المرفوع على فيرسيل هنا مباشرة
  baseURL: import.meta.env.VITE_API_URL || "https://modern-system-flame.vercel.app", 
});

export default api;