import { prisma } from '../lib/prisma.js';

// 1. جلب كل الملفات المؤرشفة
export const getAllFiles = async (req, res) => {
  try {
    const files = await prisma.archiveFile.findMany({
      orderBy: { uploadedAt: 'desc' }
    });
    // تحويل البيانات لتطابق ما يتوقعه الفرونت إند تماماً
    const formattedFiles = files.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      jobId: f.jobId || '',
      url: f.url,
      uploadedAt: f.uploadedAt.toISOString()
    }));
    res.json(formattedFiles);
  } catch (error) {
    console.error('❌ Get Files Error:', error);
    res.status(500).json([]);
  }
};

// 2. حفظ ملف جديد
export const createArchiveFile = async (req, res) => {
  try {
    const { name, type, jobId, url } = req.body;
    const newFile = await prisma.archiveFile.create({
      data: {
        name,
        type,
        jobId: jobId || null,
        url,
        uploadedAt: new Date()
      }
    });
    res.status(201).json(newFile);
  } catch (error) {
    console.error('❌ Create File Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 3. حذف ملف
export const deleteArchiveFile = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.archiveFile.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete File Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};