import { prisma } from '../lib/prisma.js';

export const getAgents = async (req, res) => {
  try {
    const agents = await prisma.shippingAgent.findMany({ orderBy: { id: 'desc' } });
    const formatted = agents.map(a => ({ ...a, id: String(a.id) }));
    return res.status(200).json(formatted);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch agents" });
  }
};

export const createAgent = async (req, res) => {
  try {
    const data = req.body;
    const fileUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : data.attachmentUrl;

    const newAgent = await prisma.shippingAgent.create({
      data: {
        name: data.name,
        company: data.company || null, 
        address: data.address || null,
        telephone: data.telephone || null,
        personalNumber: data.personalNumber || null,
        email: data.email || null,
        attachmentUrl: fileUrl || null
      }
    });
    return res.status(201).json({ ...newAgent, id: String(newAgent.id) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: "البريد الإلكتروني موجود بالفعل!" });
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateAgent = async (req, res) => {
  try {
    const numericId = parseInt(req.params.id);
    const data = req.body;
    const existing = await prisma.shippingAgent.findUnique({ where: { id: isNaN(numericId) ? 0 : numericId } });
    if (!existing) return res.status(404).json({ error: "Agent not found" });

    let fileUrl = existing.attachmentUrl;
    if (req.file) {
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    } else if (data.attachmentUrl === 'null' || data.attachmentUrl === null) {
      fileUrl = null;
    } else if (data.attachmentUrl) {
      fileUrl = data.attachmentUrl;
    }

    const updated = await prisma.shippingAgent.update({
      where: { id: numericId },
      data: {
        name: data.name ?? undefined,
        company: data.company ?? undefined,
        address: data.address ?? undefined,
        telephone: data.telephone ?? undefined,
        personalNumber: data.personalNumber ?? undefined,
        email: data.email ?? undefined,
        attachmentUrl: fileUrl === undefined ? existing.attachmentUrl : fileUrl
      }
    });
    return res.status(200).json({ ...updated, id: String(updated.id) });
  } catch (error) {
    return res.status(400).json({ error: "فشل التحديث: " + error.message });
  }
};

export const deleteAgent = async (req, res) => {
    try {
        const numericId = parseInt(req.params.id);
        await prisma.shippingAgent.deleteMany({ where: { id: isNaN(numericId) ? 0 : numericId } });
        return res.status(200).json({ success: true, message: "Action completed" });
    } catch (error) {
        return res.status(500).json({ error: "Server Error" });
    }
};