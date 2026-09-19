import type { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import PriceList from '../models/PriceList';

export const getProducts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawProducts = await Product.find().lean().sort({ slNo: 1, createdAt: 1 });
    const priceItems = await PriceList.find().lean();
    const priceMap = new Map<string, any>();
    priceItems.forEach((item: any) => {
      if (item.itemName) {
        priceMap.set(item.itemName.toLowerCase().trim(), item);
      }
    });

    const products = rawProducts.map((p: any) => {
      const key = (p.name || '').toLowerCase().trim();
      const pItem = priceMap.get(key);

      const pShop = Number(p.shopStock ?? p.shop_stock ?? p['Shop Stock'] ?? p.shop ?? p['Shop'] ?? p.counterStock ?? 0);
      const pGodown = Number(p.godownStock ?? p.godown_stock ?? p['Godown Stock'] ?? p.godown ?? p['Godown'] ?? p.warehouse ?? 0);
      const pStock = Number(p.stock ?? p.quantity ?? p.qty ?? p['Qty'] ?? p['Total Stock'] ?? 0);

      const plShop = Number(pItem?.shopStock ?? pItem?.shop_stock ?? pItem?.['Shop Stock'] ?? pItem?.shop ?? 0);
      const plGodown = Number(pItem?.godownStock ?? pItem?.godown_stock ?? pItem?.['Godown Stock'] ?? pItem?.godown ?? 0);
      const plStock = Number(pItem?.stock ?? pItem?.quantity ?? pItem?.qty ?? 0);

      const shopStock = pShop > 0 ? pShop : plShop;
      const godownStock = pGodown > 0 ? pGodown : plGodown;
      const stock = (pStock > 0 ? pStock : plStock) || (shopStock + godownStock);

      return {
        ...p,
        shopStock,
        godownStock,
        stock,
      };
    });

    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const p: any = await Product.findById(req.params.id).lean();
    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const cleanName = (p.name || '').trim();
    const priceItem: any = cleanName ? await PriceList.findOne({
      itemName: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).lean() : null;

    const pShop = Number(p.shopStock ?? p.shop_stock ?? p['Shop Stock'] ?? p.shop ?? p['Shop'] ?? p.counterStock ?? 0);
    const pGodown = Number(p.godownStock ?? p.godown_stock ?? p['Godown Stock'] ?? p.godown ?? p['Godown'] ?? p.warehouse ?? 0);
    const pStock = Number(p.stock ?? p.quantity ?? p.qty ?? p['Qty'] ?? p['Total Stock'] ?? 0);

    const plShop = Number(priceItem?.shopStock ?? priceItem?.shop_stock ?? priceItem?.shop ?? 0);
    const plGodown = Number(priceItem?.godownStock ?? priceItem?.godown_stock ?? priceItem?.godown ?? 0);
    const plStock = Number(priceItem?.stock ?? priceItem?.quantity ?? priceItem?.qty ?? 0);

    const shopStock = pShop > 0 ? pShop : plShop;
    const godownStock = pGodown > 0 ? pGodown : plGodown;
    const stock = (pStock > 0 ? pStock : plStock) || (shopStock + godownStock);

    res.status(200).json({
      success: true,
      data: {
        ...p,
        shopStock,
        godownStock,
        stock,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const shopStockVal = Number(req.body.shopStock ?? req.body.shop_stock ?? req.body['Shop Stock'] ?? req.body.shop ?? 0);
    const godownStockVal = Number(req.body.godownStock ?? req.body.godown_stock ?? req.body['Godown Stock'] ?? req.body.godown ?? 0);
    const stockVal = (shopStockVal + godownStockVal) > 0 ? (shopStockVal + godownStockVal) : Number(req.body.stock ?? req.body.quantity ?? req.body.qty ?? 0);

    const product = await Product.create({
      ...req.body,
      shopStock: shopStockVal,
      godownStock: godownStockVal,
      stock: stockVal,
    });

    // Sync to PriceList
    try {
      const cleanName = (product.name || '').trim();
      const existingPrice = await PriceList.findOne({
        itemName: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (!existingPrice && cleanName) {
        const totalCount = await PriceList.countDocuments();

        await PriceList.create({
          slNo: totalCount + 1,
          itemName: cleanName,
          category: product.category || 'General',
          unit: product.unit || 'Box',
          mrp: product.mrp || 0,
          rate: product.rate || 0,
          shopStock: shopStockVal,
          godownStock: godownStockVal,
          stock: stockVal,
          effectiveDate: new Date().toISOString().split('T')[0],
          batchName: 'Product Sync',
        });
      }
    } catch (syncErr) {
      console.warn('[Product Create Sync Warning]:', syncErr);
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const oldName = oldProduct.name;
    const shopStockVal = req.body.shopStock !== undefined ? Number(req.body.shopStock) : (req.body.shop_stock !== undefined ? Number(req.body.shop_stock) : undefined);
    const godownStockVal = req.body.godownStock !== undefined ? Number(req.body.godownStock) : (req.body.godown_stock !== undefined ? Number(req.body.godown_stock) : undefined);

    const updatePayload: any = {
      ...req.body,
      ...(shopStockVal !== undefined && { shopStock: shopStockVal }),
      ...(godownStockVal !== undefined && { godownStock: godownStockVal }),
    };

    if (shopStockVal !== undefined || godownStockVal !== undefined) {
      const curShop = shopStockVal !== undefined ? shopStockVal : Number(oldProduct.shopStock || 0);
      const curGodown = godownStockVal !== undefined ? godownStockVal : Number(oldProduct.godownStock || 0);
      updatePayload.stock = curShop + curGodown;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Sync update to PriceList
    try {
      const escapedOldName = oldName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await PriceList.updateMany(
        { itemName: { $regex: new RegExp(`^${escapedOldName}$`, 'i') } },
        {
          ...(product.name && { itemName: product.name.trim() }),
          ...(product.category && { category: product.category }),
          ...(product.unit && { unit: product.unit }),
          ...(product.rate !== undefined && { rate: Number(product.rate) }),
          ...(product.mrp !== undefined && { mrp: Number(product.mrp) }),
          ...(product.shopStock !== undefined && { shopStock: Number(product.shopStock) }),
          ...(product.godownStock !== undefined && { godownStock: Number(product.godownStock) }),
          ...(product.stock !== undefined && { stock: Number(product.stock) }),
        }
      );
    } catch (syncErr) {
      console.warn('[Product Update Sync Warning]:', syncErr);
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const productName = product.name;

    // 1. Delete product
    await Product.findByIdAndDelete(req.params.id);

    // 2. Cascade Delete: Delete from PriceList collection as well
    if (productName && productName.trim()) {
      const escapedName = productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await PriceList.deleteMany({
        itemName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'No product IDs provided for deletion' });
      return;
    }

    // 1. Find all products to get their names for cascading deletion in PriceList
    const productsToDelete = await Product.find({ _id: { $in: ids } });
    const productNames = productsToDelete
      .map((p) => p.name ? p.name.trim() : '')
      .filter(Boolean);

    // 2. Delete products from Product collection
    await Product.deleteMany({ _id: { $in: ids } });

    // 3. Delete matching items from PriceList collection as well
    if (productNames.length > 0) {
      const regexPatterns = productNames.map(
        (name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      );
      await PriceList.deleteMany({
        itemName: { $in: regexPatterns },
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${productsToDelete.length} products and synced PriceList`,
      count: productsToDelete.length,
    });
  } catch (error) {
    next(error);
  }
};

