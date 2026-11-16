/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;

    const discountRate = Number(discount ?? 0) / 100;
    const fullPrice = Number(sale_price) * Number(quantity);

    if (!Number.isFinite(fullPrice) || !Number.isFinite(discountRate)) {
        throw new TypeError("Некорректные данные для расчёта выручки")
    }

    return fullPrice * (1 - discountRate);

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
    const { profit } = seller;

    if (total <= 0 || index < 0 || index >= total) return 0;

    let rate;

    if (index === 0) {
        rate = 0.15;
    } else if (index === total - 1) {
        rate = 0;
    } else if (index === 1 || index === 2) {
        rate = 0.10;
    } else {
        rate = 0.05;
    }

    return profit * rate;

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
        data.products.map(product => [product.sku, product])
    );

    const sellersById = new Map(
        data.sellers.map(seller => [
            seller.id, {
                seller_id: seller.id,
                name: `${seller.first_name} ${seller.last_name}`,
                revenue: 0,
                profit: 0,
                sales_count: 0,
                products_sold: new Map()
            }
        ])
    )

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    // @TODO: Расчет выручки и прибыли для каждого продавца
    for (const record of data.purchase_records) {
        const seller = sellersById.get(record.seller_id);

        if (!seller) {
            throw new Error(`Не найден продавец: ${record.seller_id}`)
        }

        seller.sales_count += 1;

        for (const item of record.items ?? []) {
            const product = productsbySku.get(item.sku);

            if (!product) {
                throw new Error(`Не найден товар: ${item.sku}`);
            }
            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;

            seller.revenue += revenue;
            seller.profit += revenue - cost;
            seller.products_sold.set(
                item.sku,
                (seller.products_sold.get(item.sku) ?? 0) + item.quantity
            );
        }
    }

    // @TODO: Сортировка продавцов по прибыли
    const rankedSellers = [...sellersById.values()]
        .sort((a, b) => b.profit - a.profit);
    
    // @TODO: Назначение премий на основе ранжирования
    // @TODO: Подготовка итоговой коллекции с нужными полями
    return rankedSellers.map((seller, index) => {
        const topProducts = [...seller.products_sold.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([sku, quantity]) => ({
            sku,
            name: productsbySku.get(sku).name,
            quantity
        }));

        return {
            seller_id: seller.seller_id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +calculateBonus(index, rankedSellers.length, seller).toFixed(2)
        }
    });
    
}
