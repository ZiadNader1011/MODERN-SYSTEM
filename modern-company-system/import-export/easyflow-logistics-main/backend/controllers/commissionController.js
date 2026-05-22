import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';

export const getCommissions = async (req, res) => {
    try {
        const commissions = await prisma.commission.findMany({ orderBy: { date: 'desc' } });
        const formatted = commissions.map(c => ({
            ...c,
            id: String(c.id),
            attachments: typeof c.attachments === 'string' ? JSON.parse(c.attachments) : (c.attachments || [])
        }));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch commissions" });
    }
};

export const createCommission = async (req, res) => {
    try {
        const data = req.body;
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                url: `${req.protocol}://${req.get('host')}/uploads/commissions/${file.filename}`,
                description: file.originalname,
                createdAt: new Date().toISOString()
            }));
        }

        const newCommission = await prisma.commission.create({
            data: {
                date: new Date(data.date),
                clientName: data.clientName,
                trader: data.trader || '',
                product: data.product || '',
                qualityRepresentative: data.qualityRepresentative || '',
                numberOfContainers: parseInt(data.numberOfContainers) || 0,
                totalQuantityTon: parseFloat(data.totalQuantityTon) || 0,
                commissionPerTon: parseFloat(data.commissionPerTon) || 0,
                currency: data.currency || 'USD',
                attachments: attachments 
            }
        });
        res.status(201).json({ ...newCommission, id: String(newCommission.id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const numericId = parseInt(id);

        const existing = await prisma.commission.findUnique({ where: { id: isNaN(numericId) ? 0 : numericId } });
        if (!existing) return res.status(404).json({ error: "Not found" });

        let keptAttachments = [];
        if (data.attachments) {
            keptAttachments = typeof data.attachments === 'string' ? JSON.parse(data.attachments) : data.attachments;
        }

        let newFiles = [];
        if (req.files && req.files.length > 0) {
            newFiles = req.files.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                url: `${req.protocol}://${req.get('host')}/uploads/commissions/${file.filename}`,
                description: file.originalname,
                createdAt: new Date().toISOString()
            }));
        }

        const finalAttachments = [...keptAttachments, ...newFiles];

        const updated = await prisma.commission.update({
            where: { id: numericId },
            data: {
                date: data.date ? new Date(data.date) : existing.date,
                clientName: data.clientName !== undefined ? data.clientName : existing.clientName,
                trader: data.trader !== undefined ? data.trader : existing.trader,
                product: data.product !== undefined ? data.product : existing.product,
                qualityRepresentative: data.qualityRepresentative !== undefined ? data.qualityRepresentative : existing.qualityRepresentative,
                numberOfContainers: data.numberOfContainers !== undefined ? parseInt(data.numberOfContainers) : existing.numberOfContainers,
                totalQuantityTon: data.totalQuantityTon !== undefined ? parseFloat(data.totalQuantityTon) : existing.totalQuantityTon,
                commissionPerTon: data.commissionPerTon !== undefined ? parseFloat(data.commissionPerTon) : existing.commissionPerTon,
                currency: data.currency || existing.currency,
                attachments: finalAttachments
            }
        });
        res.json({ ...updated, id: String(updated.id) });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteCommission = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.commission.deleteMany({ where: { id: parseInt(id) } });
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Delete failed" });
    }
};