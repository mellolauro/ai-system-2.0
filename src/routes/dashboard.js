const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function nullable(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    const normalized =
        String(value).trim();

    return normalized
        ? normalized
        : null;
}


function normalizePhone(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    /*
     * Mantemos o "+" quando informado e removemos
     * espaços, parênteses, hífens etc.
     */
    const raw =
        String(value).trim();

    if (!raw) {
        return "";
    }

    const hasPlus =
        raw.startsWith("+");

    const digits =
        raw.replace(/\D/g, "");

    if (!digits) {
        return "";
    }

    return hasPlus
        ? `+${digits}`
        : digits;
}


/*
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

// GET /dashboard - Visão Geral
router.get(
    "/",
    async (
        req,
        res,
        next
    ) => {

        try {

            const [
                productsCount,
                usersCount,
                tenantsCount,
                ordersCount,
                paidOrders,
                recentOrders
            ] =
                await Promise.all([

                    prisma.product.count({
                        where: {
                            active:
                                true
                        }
                    }),

                    prisma.user.count(),

                    prisma.tenant.count({
                        where: {
                            active:
                                true
                        }
                    }),

                    prisma.order.count(),

                    prisma.order.findMany({

                        where: {
                            paymentStatus:
                                "PAID"
                        },

                        select: {
                            total:
                                true
                        }

                    }),

                    prisma.order.findMany({

                        take:
                            5,

                        orderBy: {
                            createdAt:
                                "desc"
                        },

                        include: {

                            user:
                                true,

                            deliveries: {

                                include: {
                                    driver:
                                        true
                                }

                            }

                        }

                    })

                ]);

            const totalRevenue =
                paidOrders.reduce(
                    (
                        acc,
                        curr
                    ) =>
                        acc +
                        (
                            curr.total ||
                            0
                        ),
                    0
                );

            res.render(
                "dashboard",
                {

                    productsCount,

                    usersCount,

                    tenantsCount,

                    ordersCount,

                    revenue:
                        totalRevenue,

                    recentOrders

                }
            );

        } catch (err) {

            next(err);

        }

    }
);


/*
 * ============================================================
 * RASTREAMENTO
 * ============================================================
 */

// GET /dashboard/tracking - Rastreio GPS
router.get(
    "/tracking",
    async (
        req,
        res,
        next
    ) => {

        try {

            const drivers =
                await prisma.driver.findMany({

                    where: {
                        active:
                            true
                    },

                    orderBy: {
                        name:
                            "asc"
                    }

                });

            res.render(
                "dashboard/tracking",
                {

                    title:
                        "Rastreamento GPS em Tempo Real",

                    drivers,

                    defaultDriverPhone:
                        drivers.length > 0
                            ? drivers[0].phone
                            : null

                }
            );

        } catch (err) {

            next(err);

        }

    }
);


/*
 * ============================================================
 * ENTREGADORES
 * ============================================================
 */

// GET /dashboard/drivers
// Lista todos os entregadores.
router.get(
    "/drivers",
    async (
        req,
        res,
        next
    ) => {

        try {

            const drivers =
                await prisma.driver.findMany({

                    include: {

                        _count: {

                            select: {
                                deliveries:
                                    true
                            }

                        }

                    },

                    orderBy: {
                        createdAt:
                            "desc"
                    }

                });

            res.render(
                "dashboard/drivers",
                {

                    drivers,

                    success:
                        req.query.success ||
                        null,

                    error:
                        req.query.error ||
                        null

                }
            );

        } catch (err) {

            next(err);

        }

    }
);


// POST /dashboard/drivers
// Cadastra novo entregador.
router.post(
    "/drivers",
    async (
        req,
        res,
        next
    ) => {

        try {

            const {
                name,
                phone,
                vehicle,
                plate,
                vehicleInfo
            } =
                req.body;

            const normalizedName =
                nullable(name);

            const normalizedPhone =
                normalizePhone(phone);

            if (!normalizedName) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Nome do entregador é obrigatório."
                    )
                );

            }

            if (!normalizedPhone) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Telefone do entregador é obrigatório."
                    )
                );

            }

            /*
             * Arquitetura atual:
             * uma instalação possui um tenant.
             */
            const tenant =
                await prisma.tenant.findFirst({

                    where: {
                        active:
                            true
                    },

                    orderBy: {
                        createdAt:
                            "asc"
                    }

                });

            if (!tenant) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Nenhum tenant ativo encontrado."
                    )
                );

            }

            /*
             * phone é @unique no schema.
             */
            const existingDriver =
                await prisma.driver.findUnique({

                    where: {
                        phone:
                            normalizedPhone
                    }

                });

            if (existingDriver) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Já existe um entregador cadastrado com este telefone."
                    )
                );

            }

            await prisma.driver.create({

                data: {

                    name:
                        normalizedName,

                    phone:
                        normalizedPhone,

                    vehicle:
                        nullable(vehicle),

                    plate:
                        nullable(plate),

                    vehicleInfo:
                        nullable(vehicleInfo),

                    active:
                        true,

                    status:
                        "AVAILABLE",

                    tenantId:
                        tenant.id

                }

            });

            return res.redirect(
                "/dashboard/drivers?success=" +
                encodeURIComponent(
                    "Entregador cadastrado com sucesso."
                )
            );

        } catch (err) {

            /*
             * Proteção adicional contra concorrência
             * no campo phone @unique.
             */
            if (
                err &&
                err.code ===
                "P2002"
            ) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Já existe um entregador cadastrado com este telefone."
                    )
                );

            }

            next(err);

        }

    }
);


// POST /dashboard/drivers/:id
// Edita um entregador existente.
router.post(
    "/drivers/:id",
    async (
        req,
        res,
        next
    ) => {

        try {

            const {
                id
            } =
                req.params;

            const {
                name,
                phone,
                vehicle,
                plate,
                vehicleInfo,
                status
            } =
                req.body;

            const driver =
                await prisma.driver.findUnique({

                    where: {
                        id
                    }

                });

            if (!driver) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Entregador não encontrado."
                    )
                );

            }

            const normalizedName =
                nullable(name);

            const normalizedPhone =
                normalizePhone(phone);

            if (!normalizedName) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Nome do entregador é obrigatório."
                    )
                );

            }

            if (!normalizedPhone) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Telefone do entregador é obrigatório."
                    )
                );

            }

            /*
             * Se o telefone foi alterado, verificamos
             * se pertence a outro entregador.
             */
            const phoneOwner =
                await prisma.driver.findUnique({

                    where: {
                        phone:
                            normalizedPhone
                    }

                });

            if (
                phoneOwner &&
                phoneOwner.id !== id
            ) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Já existe outro entregador cadastrado com este telefone."
                    )
                );

            }

            const allowedStatuses =
                [
                    "AVAILABLE",
                    "BUSY",
                    "OFFLINE"
                ];

            const normalizedStatus =
                allowedStatuses.includes(
                    status
                )
                    ? status
                    : driver.status;

            await prisma.driver.update({

                where: {
                    id
                },

                data: {

                    name:
                        normalizedName,

                    phone:
                        normalizedPhone,

                    vehicle:
                        nullable(vehicle),

                    plate:
                        nullable(plate),

                    vehicleInfo:
                        nullable(vehicleInfo),

                    status:
                        normalizedStatus

                }

            });

            return res.redirect(
                "/dashboard/drivers?success=" +
                encodeURIComponent(
                    "Entregador atualizado com sucesso."
                )
            );

        } catch (err) {

            if (
                err &&
                err.code ===
                "P2002"
            ) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Já existe outro entregador cadastrado com este telefone."
                    )
                );

            }

            next(err);

        }

    }
);


// POST /dashboard/drivers/:id/toggle-active
// Ativa ou desativa sem apagar histórico.
router.post(
    "/drivers/:id/toggle-active",
    async (
        req,
        res,
        next
    ) => {

        try {

            const {
                id
            } =
                req.params;

            const driver =
                await prisma.driver.findUnique({

                    where: {
                        id
                    }

                });

            if (!driver) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Entregador não encontrado."
                    )
                );

            }

            const newActive =
                !driver.active;

            await prisma.driver.update({

                where: {
                    id
                },

                data: {

                    active:
                        newActive,

                    /*
                     * Ao desativar, fica OFFLINE.
                     * Ao reativar, volta AVAILABLE.
                     */
                    status:
                        newActive
                            ? "AVAILABLE"
                            : "OFFLINE"

                }

            });

            return res.redirect(
                "/dashboard/drivers?success=" +
                encodeURIComponent(
                    newActive
                        ? "Entregador ativado com sucesso."
                        : "Entregador desativado com sucesso."
                )
            );

        } catch (err) {

            next(err);

        }

    }
);


/*
 * ============================================================
 * PEDIDOS / ENTREGADORES
 * ============================================================
 */

// POST /dashboard/orders/:id/assign-driver
// Associar entregador ao pedido.
router.post(
    "/orders/:id/assign-driver",
    async (
        req,
        res,
        next
    ) => {

        try {

            const {
                id
            } =
                req.params;

            const {
                driverId
            } =
                req.body;

            if (driverId) {

                /*
                 * Como Delivery.orderId é @unique,
                 * primeiro verificamos se já existe
                 * Delivery para o pedido.
                 */
                const existingDelivery =
                    await prisma.delivery.findUnique({

                        where: {
                            orderId:
                                id
                        }

                    });

                if (existingDelivery) {

                    await prisma.delivery.update({

                        where: {
                            id:
                                existingDelivery.id
                        },

                        data: {

                            driverId,

                            status:
                                "ASSIGNED"

                        }

                    });

                } else {

                    const order =
                        await prisma.order.findUnique({

                            where: {
                                id
                            },

                            select: {
                                tenantId:
                                    true
                            }

                        });

                    if (!order) {

                        return res.redirect(
                            `/orders/${id}`
                        );

                    }

                    await prisma.delivery.create({

                        data: {

                            orderId:
                                id,

                            driverId,

                            tenantId:
                                order.tenantId,

                            status:
                                "ASSIGNED"

                        }

                    });

                }

                await prisma.order.update({

                    where: {
                        id
                    },

                    data: {
                        status:
                            "SHIPPED"
                    }

                });

            }

            res.redirect(
                `/orders/${id}`
            );

        } catch (err) {

            next(err);

        }

    }
);


module.exports = router;
