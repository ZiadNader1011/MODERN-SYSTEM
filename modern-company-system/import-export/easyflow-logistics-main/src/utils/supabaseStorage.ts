import { supabase } from "./supabaseClient";

export const uploadAttachment = async (file: File, bucketName: string = 'attachments'): Promise<string | null> => {
    try {
        // توليد اسم فريد للملف باستخدام التوقيت الحالي ورقم عشوائي لمنع مسح ملف قديم بنفس الاسم
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // 1. رفع الملف إلى البكت المحدد
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. جلب الرابط المباشر (Public URL) للملف
        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        // ده الرابط اللي هتحفظه في الجدول في الـ Database
        return urlData?.publicUrl || null; 

    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
};