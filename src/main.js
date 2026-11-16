/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  if (!purchase || typeof purchase !== "object") {
    return 0;
  }

  const price = Number(purchase.sale_price);
  const count = Number(purchase.quantity);
  const discountRate = Number(purchase.discount ?? 0) / 100;

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(count) ||
    !Number.isFinite(discountRate)
  ) {
    throw new TypeError("Некорректные данные для расчёта выручки");
  }

  return price * count * (1 - discountRate);
  // @TODO: Расчет выручки от операции
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  if (
    !seller ||
    !Number.isFinite(Number(seller.profit)) ||
    total <= 0 ||
    index < 0 ||
    index >= total
  ) {
    return 0;
  }

  let rate;

  if (index === total - 1) {
    rate = 0;
  } else if (index === 0) {
    rate = 0.15;
  } else if (index === 1 || index === 2) {
    rate = 0.1;
  } else {
    rate = 0.05;
  }

  return Number(seller.profit) * rate;

  // @TODO: Расчет бонуса от позиции в рейтинге
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records)
  ) {
    throw new TypeError("Некорректная структура data");
  }

  if (!options || typeof options !== "object") {
    throw new TypeError("options должен быть объектом");
  }

  // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;

  if (
    typeof calculateBonus !== "function" ||
    typeof calculateRevenue !== "function"
  ) {
    throw new TypeError("Нужно передать calculateRevenur и calculateBonus");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const productsbySku = new Map(
    data.products.map((product) => [product.sku, product]),
  );

  const sellersById = new Map(
    data.sellers.map((seller) => [
      seller.id,
      {
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: new Map(),
      },
    ]),
  );

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  // @TODO: Расчет выручки и прибыли для каждого продавца
  for (const record of data.purchase_records) {
    const seller = sellersById.get(record.seller_id);

    if (!seller) {
      throw new Error(`Не найден продавец: ${record.seller_id}`);
    }

    seller.sales_count += 1;

    for (const item of record.items ?? []) {
      const product = productsbySku.get(item.sku);

      if (!product) {
        throw new Error(`Не найден товар: ${item.sku}`);
      }
      const quantity = Number(item.quantity);
      const revenue = Number(calculateRevenue(item, product));
      const cost = Number(product.purchase_price) * quantity;

      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(revenue) ||
        !Number.isFinite(cost)
      ) {
        throw new TypeError("Некорректные данные для расчёта прибыли");
      }

      seller.revenue += revenue;
      seller.profit += revenue - cost;
      seller.products_sold.set(
        item.sku,
        (seller.products_sold.get(item.sku) ?? 0) + quantity,
      );
    }
  }

  // @TODO: Сортировка продавцов по прибыли
  const rankedSellers = [...sellersById.values()].sort(
    (a, b) => b.profit - a.profit || a.seller_id - b.seller_id,
  );

  // @TODO: Назначение премий на основе ранжирования
  // @TODO: Подготовка итоговой коллекции с нужными полями
  return rankedSellers.map((seller, index) => {
    const topProducts = [...seller.products_sold.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku, quantity]) => ({
        sku,
        quantity,
      }));

    return {
      seller_id: seller.seller_id,
      name: seller.name,
      revenue: +seller.revenue.toFixed(2),
      profit: +seller.profit.toFixed(2),
      sales_count: seller.sales_count,
      top_products: topProducts,
      bonus: +calculateBonus(index, rankedSellers.length, seller).toFixed(2),
    };
  });
}
