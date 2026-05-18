import { prisma } from '../lib/prisma.js';

// ============================================================================
// GET ALL SUPPLIERS
// ============================================================================
export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // تحويل الـ ID لـ String لضمان سلامة الـ Matching مع الفرونت إند
    const formattedSuppliers = suppliers.map(s => ({ ...s, id: String(s.id) }));
    res.json(formattedSuppliers);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

// ============================================================================
// GET ALL PRODUCTS (🚀 تم قفل جدار حماية العلاقات هنا)
// ============================================================================
export const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // 🌟 تحويل كل الـ IDs لـ String عشان الفرونت إند يقارن بشكل سليم ومستحيل يعلق Unknown!
    const formattedProducts = products.map(p => ({
      ...p,
      id: String(p.id),
      supplierId: p.supplierId ? String(p.supplierId) : null,
      supplierIds: Array.isArray(p.supplierIds) ? p.supplierIds.map(String) : []
    }));

    res.json(formattedProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// CREATE PRODUCT
// ============================================================================
export const createProduct = async (req, res) => {
  try {
    const { name, category, supplierIds, numberOfSuppliers } = req.body;

    const formattedSupplierIds = Array.isArray(supplierIds) 
      ? supplierIds.map(id => parseInt(id)).filter(id => !isNaN(id))
      : (supplierIds && !isNaN(parseInt(supplierIds)) ? [parseInt(supplierIds)] : []);

    const newProduct = await prisma.product.create({
      data: {
        name,
        category,
        numberOfSuppliers: parseInt(numberOfSuppliers) || 0,
        supplierId: formattedSupplierIds.length > 0 ? formattedSupplierIds[0] : null,
        supplierIds: formattedSupplierIds
      }
    });

    res.status(201).json({ 
      ...newProduct, 
      id: String(newProduct.id),
      supplierId: newProduct.supplierId ? String(newProduct.supplierId) : null,
      supplierIds: Array.isArray(newProduct.supplierIds) ? newProduct.supplierIds.map(String) : []
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to save product: " + error.message });
  }
};

// ============================================================================
// UPDATE PRODUCT
// ============================================================================
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, numberOfSuppliers, supplierIds } = req.body;
    
    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        name: name !== undefined ? name : undefined,
        category: category !== undefined ? category : undefined,
        numberOfSuppliers: numberOfSuppliers !== undefined ? parseInt(numberOfSuppliers) : undefined,
        supplierIds: supplierIds !== undefined ? supplierIds.map(id => parseInt(id)) : undefined,
        supplierId: (supplierIds && supplierIds.length > 0) ? parseInt(supplierIds[0]) : undefined,
      }
    });

    res.json({
      ...updatedProduct,
      id: String(updatedProduct.id),
      supplierId: updatedProduct.supplierId ? String(updatedProduct.supplierId) : null,
      supplierIds: Array.isArray(updatedProduct.supplierIds) ? updatedProduct.supplierIds.map(String) : []
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ============================================================================
// DELETE PRODUCT
// ============================================================================
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.deleteMany({
      where: { id: Number(id) }
    });
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};