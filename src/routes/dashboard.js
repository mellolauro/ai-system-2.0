const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const FinancialService =
    require("../services/FinancialService");

const ProviderManager =
    require("../providers/ProviderManager");

const {
    getDashboardPeriod
} = require("../utils/dashboardPeriod");

const {
    getDriverGpsStatus
} = require("../utils/driverGps");

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getDriverInviteEncryptionKey() {

    if (!process.env.SESSION_SECRET) {
        throw new Error(
            "SESSION_SECRET não configurado."
        );
    }

    return crypto
        .createHash("sha256")
        .update(
            String(
                process.env.SESSION_SECRET
            )
        )
        .digest();
}


function encryptDriverInviteToken(token) {

    const iv =
        crypto.randomBytes(12);

    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            getDriverInviteEncryptionKey(),
            iv
        );

    const ciphertext =
        Buffer.concat([
            cipher.update(
                String(token),
                "utf8"
            ),
            cipher.final()
        ]);

    const tag =
        cipher.getAuthTag();

    return {
        iv:
            iv.toString("base64"),
        tag:
            tag.toString("base64"),
        ciphertext:
            ciphertext.toString("base64")
    };
}


function decryptDriverInviteToken(payload) {

    if (
        !payload ||
        !payload.iv ||
        !payload.tag ||
        !payload.ciphertext
    ) {
        throw new Error(
            "Convite criptografado inválido."
        );
    }

    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            getDriverInviteEncryptionKey(),
            Buffer.from(
                payload.iv,
                "base64"
            )
        );

    decipher.setAuthTag(
        Buffer.from(
            payload.tag,
            "base64"
        )
    );

    const plaintext =
        Buffer.concat([
            decipher.update(
                Buffer.from(
                    payload.ciphertext,
                    "base64"
                )
            ),
            decipher.final()
        ]);

    return plaintext.toString("utf8");
}


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

            const tenantId =
                req.session?.tenantId;

            if (!tenantId) {
                return res
                    .status(401)
                    .send(
                        "Sessão administrativa inválida."
                    );
            }

            const systemHealth = {
                application: {
                    status:
                        "operational"
                },

                database: {
                    status:
                        "unavailable"
                },

                artificialIntelligence: {
                    status:
                        "unavailable"
                }
            };

            const [
                databaseHealth,
                artificialIntelligenceHealth
            ] =
                await Promise.allSettled([

                    prisma.$queryRaw`SELECT 1`,

                    (async () => {

                        const provider =
                            ProviderManager.current();

                        return provider.health();

                    })()

                ]);

            if (
                databaseHealth.status ===
                "fulfilled"
            ) {

                systemHealth.database.status =
                    "operational";

            } else {

                console.error(
                    "[Dashboard][Health] Banco de dados indisponível:",
                    databaseHealth.reason?.message ||
                    databaseHealth.reason
                );

            }

            if (
                artificialIntelligenceHealth.status ===
                "fulfilled" &&
                artificialIntelligenceHealth.value?.status ===
                "healthy"
            ) {

                systemHealth.artificialIntelligence.status =
                    "operational";

            } else {

                console.error(
                    "[Dashboard][Health] Inteligência artificial indisponível:",
                    artificialIntelligenceHealth.status ===
                    "rejected"
                        ? (
                            artificialIntelligenceHealth.reason?.message ||
                            artificialIntelligenceHealth.reason
                        )
                        : artificialIntelligenceHealth.value?.status
                );

            }

            const period =
                getDashboardPeriod({
                    preset:
                        req.query.period,
                    start:
                        req.query.start,
                    end:
                        req.query.end
                });

            const validOrderStatuses =
                new Set([
                    "PENDING",
                    "PROCESSING",
                    "PAID",
                    "SHIPPED",
                    "DELIVERED",
                    "CANCELLED",
                    "REFUNDED"
                ]);

            const validPaymentStatuses =
                new Set([
                    "PENDING",
                    "PAID",
                    "FAILED",
                    "REFUNDED",
                    "CANCELLED"
                ]);

            const requestedOrderStatus =
                typeof req.query.orderStatus === "string"
                    ? req.query.orderStatus
                    : "";

            const requestedPaymentStatus =
                typeof req.query.paymentStatus === "string"
                    ? req.query.paymentStatus
                    : "";

            const orderStatus =
                validOrderStatuses.has(
                    requestedOrderStatus
                )
                    ? requestedOrderStatus
                    : null;

            const paymentStatus =
                validPaymentStatuses.has(
                    requestedPaymentStatus
                )
                    ? requestedPaymentStatus
                    : null;

            const orderFilters = {

                ...(orderStatus
                    ? {
                        status:
                            orderStatus
                    }
                    : {}),

                ...(paymentStatus
                    ? {
                        paymentStatus
                    }
                    : {})

            };

            const orderPeriodWhere = {
                tenantId,

                ...orderFilters,

                createdAt: {
                    gte:
                        period.startDate,
                    lt:
                        period.endDate
                }
            };

            const previousOrderPeriodWhere = {
                tenantId,

                ...orderFilters,

                createdAt: {
                    gte:
                        period.previousStartDate,
                    lt:
                        period.previousEndDate
                }
            };

            const financialFilterAllowsPaid =
                !paymentStatus ||
                paymentStatus === "PAID";

            const emptyFinancialSummary = (
                startDate,
                endDate
            ) => ({
                revenue:
                    0,
                knownCost:
                    0,
                grossProfit:
                    null,
                grossMargin:
                    null,
                totalUnits:
                    0,
                unitsWithKnownCost:
                    0,
                missingCostUnits:
                    0,
                costCoverage:
                    null,
                hasCompleteCost:
                    false,
                orderCount:
                    0,
                paidWithoutPaidAtCount:
                    0,
                period: {
                    startDate,
                    endDate
                }
            });

            const [
                productsCount,
                usersCount,
                tenant,
                ordersCount,
                previousOrdersCount,
                financialSummary,
                previousFinancialSummary,
                recentOrders
            ] =
                await Promise.all([

                    prisma.product.count({
                        where: {
                            tenantId,
                            active:
                                true
                        }
                    }),

                    prisma.user.count({
                        where: {
                            tenantId
                        }
                    }),

                    prisma.tenant.findFirst({
                        where: {
                            id:
                                tenantId,
                            active:
                                true
                        },

                        select: {
                            id:
                                true
                        }
                    }),

                    prisma.order.count({
                        where:
                            orderPeriodWhere
                    }),

                    prisma.order.count({
                        where:
                            previousOrderPeriodWhere
                    }),

                    financialFilterAllowsPaid
                        ? FinancialService.getPaidSummary({
                            tenantId,
                            startDate:
                                period.startDate,
                            endDate:
                                period.endDate,
                            orderStatus
                        })
                        : Promise.resolve(
                            emptyFinancialSummary(
                                period.startDate,
                                period.endDate
                            )
                        ),

                    financialFilterAllowsPaid
                        ? FinancialService.getPaidSummary({
                            tenantId,
                            startDate:
                                period.previousStartDate,
                            endDate:
                                period.previousEndDate,
                            orderStatus
                        })
                        : Promise.resolve(
                            emptyFinancialSummary(
                                period.previousStartDate,
                                period.previousEndDate
                            )
                        ),

                    prisma.order.findMany({
                        where:
                            orderPeriodWhere,

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

            const tenantsCount =
                tenant
                    ? 1
                    : 0;

            const averageTicket =
                financialSummary.orderCount > 0
                    ? (
                        financialSummary.revenue /
                        financialSummary.orderCount
                    )
                    : 0;

            const previousAverageTicket =
                previousFinancialSummary.orderCount > 0
                    ? (
                        previousFinancialSummary.revenue /
                        previousFinancialSummary.orderCount
                    )
                    : 0;

            function percentageChange(
                current,
                previous
            ) {

                const currentValue =
                    Number(current) || 0;

                const previousValue =
                    Number(previous) || 0;

                if (previousValue === 0) {
                    return currentValue === 0
                        ? 0
                        : null;
                }

                return (
                    (
                        currentValue -
                        previousValue
                    ) /
                    Math.abs(
                        previousValue
                    )
                ) * 100;

            }

            const comparisons = {

                revenue:
                    percentageChange(
                        financialSummary.revenue,
                        previousFinancialSummary.revenue
                    ),

                orders:
                    percentageChange(
                        ordersCount,
                        previousOrdersCount
                    ),

                averageTicket:
                    percentageChange(
                        averageTicket,
                        previousAverageTicket
                    ),

                grossProfit:
                    (
                        financialSummary.grossProfit !== null &&
                        previousFinancialSummary.grossProfit !== null
                    )
                        ? percentageChange(
                            financialSummary.grossProfit,
                            previousFinancialSummary.grossProfit
                        )
                        : null

            };

            res.render(
                "dashboard",
                {

                    productsCount,

                    usersCount,

                    tenantsCount,

                    ordersCount,

                    revenue:
                        financialSummary.revenue,

                    recentOrders,

                    period,

                    financialSummary,

                    previousFinancialSummary,

                    averageTicket,

                    previousAverageTicket,

                    previousOrdersCount,

                    comparisons,

                    systemHealth,

                    filters: {
                        orderStatus,
                        paymentStatus
                    }

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

            const driversWithGpsStatus =
                drivers.map(
                    (driver) => ({
                        ...driver,
                        gpsStatus:
                            getDriverGpsStatus(
                                driver
                            )
                    })
                );

            res.render(
                "dashboard/tracking",
                {

                    title:
                        "Rastreamento GPS em Tempo Real",

                    drivers:
                        driversWithGpsStatus,

                    defaultDriverPhone:
                        driversWithGpsStatus.length > 0
                            ? driversWithGpsStatus[0].phone
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

            const storedDriverActivationInvite =
                req.session.driverActivationInvite ||
                null;

            let driverActivationInvite =
                null;

            if (storedDriverActivationInvite) {

                const token =
                    decryptDriverInviteToken(
                        storedDriverActivationInvite.encryptedToken
                    );

                driverActivationInvite = {
                    driverId:
                        storedDriverActivationInvite.driverId,

                    driverName:
                        storedDriverActivationInvite.driverName,

                    driverPhone:
                        storedDriverActivationInvite.driverPhone,

                    token,

                    expiresAt:
                        storedDriverActivationInvite.expiresAt
                };

                delete req.session.driverActivationInvite;

                await new Promise(
                    (resolve, reject) => {

                        req.session.save(
                            (error) => {

                                if (error) {
                                    return reject(error);
                                }

                                resolve();

                            }
                        );

                    }
                );

            }

            const driversWithGpsStatus =
                drivers.map(
                    (driver) => ({
                        ...driver,
                        gpsStatus:
                            getDriverGpsStatus(
                                driver
                            )
                    })
                );

            res.render(
                "dashboard/drivers",
                {

                    drivers:
                        driversWithGpsStatus,

                    driverActivationInvite,

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

            /*
             * Um entregador com trabalho pendente não pode
             * ser desativado. Primeiro a entrega deve ser
             * concluída ou transferida para outro entregador.
             */
            if (!newActive) {

                const pendingDelivery =
                    await prisma.delivery.findFirst({

                        where: {
                            driverId:
                                id,
                            status: {
                                in: [
                                    "ASSIGNED",
                                    "PENDING",
                                    "SHIPPED",
                                    "OUT_FOR_DELIVERY"
                                ]
                            }
                        },

                        select: {
                            id:
                                true
                        }

                    });

                if (pendingDelivery) {

                    return res.redirect(
                        "/dashboard/drivers?error=" +
                        encodeURIComponent(
                            "Não é possível desativar este entregador enquanto houver entregas pendentes. Conclua ou transfira as entregas antes de desativá-lo."
                        )
                    );

                }

            }

            const now =
                new Date();

            await prisma.$transaction(
                async (tx) => {

                    await tx.driver.update({

                        where: {
                            id
                        },

                        data: {

                            active:
                                newActive,

                            status:
                                newActive
                                    ? "AVAILABLE"
                                    : "OFFLINE"

                        }

                    });

                    /*
                     * Ao desativar, revoga imediatamente
                     * todos os acessos de rastreamento.
                     *
                     * Ao reativar, os dispositivos antigos
                     * permanecem revogados. Um novo convite
                     * deverá ser enviado pelo WhatsApp.
                     */
                    if (!newActive) {

                        const devices =
                            await tx.driverTrackingDevice.findMany({

                                where: {
                                    driverId:
                                        id
                                },

                                select: {
                                    id:
                                        true
                                }

                            });

                        const deviceIds =
                            devices.map(
                                (device) =>
                                    device.id
                            );

                        if (deviceIds.length > 0) {

                            await tx.driverTrackingSession.updateMany({

                                where: {
                                    deviceId: {
                                        in:
                                            deviceIds
                                    },
                                    revokedAt:
                                        null
                                },

                                data: {
                                    revokedAt:
                                        now
                                }

                            });

                        }

                        await tx.driverTrackingDevice.updateMany({

                            where: {
                                driverId:
                                    id,
                                revokedAt:
                                    null
                            },

                            data: {
                                active:
                                    false,
                                revokedAt:
                                    now
                            }

                        });

                        await tx.driverActivation.updateMany({

                            where: {
                                driverId:
                                    id,
                                usedAt:
                                    null,
                                revokedAt:
                                    null
                            },

                            data: {
                                revokedAt:
                                    now
                            }

                        });

                    }

                }
            );

            return res.redirect(
                "/dashboard/drivers?success=" +
                encodeURIComponent(
                    newActive
                        ? "Entregador ativado com sucesso. Envie uma nova ativação pelo WhatsApp para liberar o celular."
                        : "Entregador desativado com sucesso. Os acessos de rastreamento foram revogados."
                )
            );

        } catch (err) {

            next(err);

        }

    }
);


/*
 * ============================================================
 * ATIVAÇÃO DE DISPOSITIVO DO ENTREGADOR
 * ============================================================
 */

// POST /dashboard/drivers/:id/activation
// Gera convite temporário e de uso único para um novo dispositivo.
router.post(
    "/drivers/:id/activation",
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
                    },

                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        active: true
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

            if (!driver.active) {

                return res.redirect(
                    "/dashboard/drivers?error=" +
                    encodeURIComponent(
                        "Ative o entregador antes de gerar um convite."
                    )
                );

            }

            const token =
                crypto
                    .randomBytes(32)
                    .toString("hex");

            const tokenHash =
                crypto
                    .createHash("sha256")
                    .update(token)
                    .digest("hex");

            const now =
                new Date();

            const expiresAt =
                new Date(
                    now.getTime() +
                    10 * 60 * 1000
                );

            const activation =
                await prisma.$transaction(
                    async (tx) => {

                        await tx.driverActivation.updateMany({

                            where: {
                                driverId:
                                    driver.id,

                                usedAt:
                                    null,

                                revokedAt:
                                    null
                            },

                            data: {
                                revokedAt:
                                    now
                            }

                        });

                        return tx.driverActivation.create({

                            data: {
                                driverId:
                                    driver.id,

                                tokenHash,

                                expiresAt
                            },

                            select: {
                                id: true
                            }

                        });

                    }
                );

            const encryptedToken =
                encryptDriverInviteToken(
                    token
                );

            req.session.driverActivationInvite = {
                driverId:
                    driver.id,

                driverName:
                    driver.name,

                driverPhone:
                    driver.phone,

                encryptedToken,

                expiresAt:
                    expiresAt.toISOString()
            };

            try {

                await new Promise(
                    (resolve, reject) => {

                        req.session.save(
                            (error) => {

                                if (error) {
                                    return reject(error);
                                }

                                resolve();

                            }
                        );

                    }
                );

            } catch (sessionError) {

                await prisma.driverActivation.updateMany({

                    where: {
                        id:
                            activation.id,

                        usedAt:
                            null,

                        revokedAt:
                            null
                    },

                    data: {
                        revokedAt:
                            new Date()
                    }

                });

                throw sessionError;

            }

            return res.redirect(
                "/dashboard/drivers"
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
                 * Segurança da associação:
                 * o entregador precisa existir, estar ativo
                 * e pertencer ao mesmo tenant do pedido.
                 */
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

                const driver =
                    await prisma.driver.findFirst({

                        where: {

                            id:
                                driverId,

                            tenantId:
                                order.tenantId,

                            active:
                                true

                        },

                        select: {
                            id:
                                true
                        }

                    });

                if (!driver) {

                    return res.redirect(
                        `/orders/${id}?error=` +
                        encodeURIComponent(
                            "Entregador inválido ou desativado."
                        )
                    );

                }

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
