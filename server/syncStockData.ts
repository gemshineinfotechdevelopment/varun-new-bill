import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { Inventory } from './models/Inventory';
import { Product } from './models/Product';
import PriceList from './models/PriceList';

const normalizeName = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s\-_/\\|.,()[\]{}'"]+/g, ' ').trim();
};

const syncStock = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    const [inventories, products, priceItems] = await Promise.all([
      Inventory.find().lean(),
      Product.find(),
      PriceList.find(),
    ]);

    console.log(`Found ${inventories.length} inventory records, ${products.length} products, ${priceItems.length} price list items.`);

    const invMap = new Map<string, any>();
    for (const inv of inventories) {
      if (inv.productName) {
        invMap.set(inv.productName.toLowerCase().trim(), inv);
        invMap.set(normalizeName(inv.productName), inv);
      }
      if (inv.sku) {
        invMap.set(String(inv.sku).toLowerCase().trim(), inv);
      }
    }

    let updatedProductsCount = 0;
    for (const p of products) {
      const exactKey = (p.name || '').toLowerCase().trim();
      const normKey = normalizeName(p.name || '');
      const skuKey = (p.sku || '').toLowerCase().trim();

      const inv = invMap.get(exactKey) || invMap.get(normKey) || (skuKey ? invMap.get(skuKey) : null);
      if (inv) {
        const shopStock = Number(inv.shopStock ?? 0);
        const godownStock = Number(inv.godownStock ?? 0);
        const stock = Number(inv.totalStock ?? (shopStock + godownStock));

        p.shopStock = shopStock;
        p.godownStock = godownStock;
        p.stock = stock;
        if (inv.sku && !p.sku) {
          p.sku = inv.sku;
        }
        await p.save();
        updatedProductsCount++;
      }
    }

    let updatedPriceCount = 0;
    for (const pl of priceItems) {
      const exactKey = (pl.itemName || '').toLowerCase().trim();
      const normKey = normalizeName(pl.itemName || '');
      const inv = invMap.get(exactKey) || invMap.get(normKey);
      if (inv) {
        const shopStock = Number(inv.shopStock ?? 0);
        const godownStock = Number(inv.godownStock ?? 0);
        const stock = Number(inv.totalStock ?? (shopStock + godownStock));

        pl.shopStock = shopStock;
        pl.godownStock = godownStock;
        pl.stock = stock;
        await pl.save();
        updatedPriceCount++;
      }
    }

    console.log(`✅ Successfully synced ${updatedProductsCount} Products and ${updatedPriceCount} PriceList items from inventories collection!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing stock:', error);
    process.exit(1);
  }
};

syncStock();
