const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// ======================
// LISTAR PEDIDOS
// ======================
router.get("/", async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                user: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.render("orders", { orders, path: 'orders' });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao carregar pedidos");
    }
});

// ======================
// FORMULÁRIO DE NOVO PEDIDO
// ======================
router.get("/new", async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        const products = await prisma.product.findMany({
            where: { stock: { gt: 0 } } // Apenas produtos com estoque
        });
        
        res.render("order-form", { 
            users, 
            products, 
            path: 'orders' 
        });
    } catch (error) {
        res.status(500).send("Erro ao abrir formulário");
    }
});

// ======================
// CRIAR PEDIDO (LÓGICA CORE)
// ======================
router.post("/create", async (req, res) => {
    try {
        const { userId, status, products, quantities } = req.body;
        
        // 1. Garantir que os arrays de produtos e quantidades existem
        const productIds = Array.isArray(products) ? products : [products];
        const qtys = Array.isArray(quantities) ? quantities : [quantities];

        // 2. Buscar detalhes dos produtos para calcular o total real
        const dbProducts = await prisma.product.findMany({
            where: { id: { in: productIds } }
        });

        let totalOrderValue = 0;
        const itemsData = productIds.map((id, index) => {
            const product = dbProducts.find(p => p.id === id);
            const qty = parseInt(qtys[index]);
            const price = product.price;
            totalOrderValue += price * qty;

            return {
                productId: id,
                quantity: qty,
                priceAtTime: price
            };
        });

        // 3. Criar Pedido e Itens em uma Transação
        const newOrder = await prisma.order.create({
            data: {
                userId,
                status,
                total: totalOrderValue,
                items: {
                    create: itemsData
                }
            }
        });

        // 4. (Opcional) Aqui você poderia disparar uma mensagem de WhatsApp
        // via Evolution API confirmando o pedido para o cliente.

        res.redirect("/orders");

    } catch (error) {
        console.error("Erro ao criar pedido:", error);
        res.status(500).send("Erro ao processar o pedido. Verifique o estoque.");
    }
});

module.exports = router;
