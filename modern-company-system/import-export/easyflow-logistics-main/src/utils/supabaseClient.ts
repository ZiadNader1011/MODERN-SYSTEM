import { createClient } from '@supabase/supabase-js';

// استدعاء القيم من متغيرات البيئة الخاصة بـ Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من وجود المتغيرات لمنع حدوث أخطاء أثناء التشغيل
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("خطأ: تأكد من إعداد متغيرات البيئة لـ Supabase في ملف .env بشكل صحيح!");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');