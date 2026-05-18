import { prisma } from '../lib/prisma.js';

export const getEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({ orderBy: { id: 'desc' } });
    const formatted = employees.map(e => ({ ...e, id: String(e.id) }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { name, jobTitle, phone } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const newEmp = await prisma.employee.create({ data: { name, jobTitle, phone } });
    res.status(201).json({ ...newEmp, id: String(newEmp.id) });
  } catch (error) {
    res.status(500).json({ error: "Error creating employee: " + error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, jobTitle, phone } = req.body;
    const updated = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { name, jobTitle, phone }
    });
    res.json({ ...updated, id: String(updated.id) });
  } catch (error) {
    res.status(400).json({ error: "Update failed" });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.employee.deleteMany({ where: { id: parseInt(id) } });
    res.json({ success: true, message: "Employee deleted" });
  } catch (error) {
    res.status(400).json({ error: "Delete failed: " + error.message });
  }
};