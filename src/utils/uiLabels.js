"use strict";

/*
 * ============================================================
 * RÓTULOS DA INTERFACE - PT-BR
 * ============================================================
 *
 * Os valores internos do sistema permanecem inalterados.
 * Este módulo traduz apenas a apresentação para o usuário.
 */

const orderStatusLabels = {
    PENDING: "Pendente",
    PROCESSING: "Em processamento",
    PAID: "Pago",
    SHIPPED: "Enviado",
    OUT_FOR_DELIVERY: "Saiu para entrega",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelado",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado"
};

const paymentStatusLabels = {
    PENDING: "Pendente",
    PAID: "Pago",
    APPROVED: "Aprovado",
    FAILED: "Falhou",
    CANCELLED: "Cancelado",
    CANCELED: "Cancelado",
    REFUNDED: "Reembolsado"
};

const deliveryStatusLabels = {
    PENDING: "Pendente",
    ASSIGNED: "Atribuída",
    SHIPPED: "Pronta para entrega",
    OUT_FOR_DELIVERY: "Em entrega",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelada",
    CANCELED: "Cancelada"
};

const driverStatusLabels = {
    AVAILABLE: "Disponível",
    BUSY: "Em entrega",
    OFFLINE: "Offline"
};

const systemStatusLabels = {
    ONLINE: "Online",
    OFFLINE: "Offline",
    FRESH: "Com sinal",
    STALE: "Sinal desatualizado",
    UNAVAILABLE: "Sem sinal"
};

function translate(labels, value) {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    return labels[value] || value;
}

function orderStatusLabel(value) {
    return translate(orderStatusLabels, value);
}

function paymentStatusLabel(value) {
    return translate(paymentStatusLabels, value);
}

function deliveryStatusLabel(value) {
    return translate(deliveryStatusLabels, value);
}

function driverStatusLabel(value) {
    return translate(driverStatusLabels, value);
}

function systemStatusLabel(value) {
    return translate(systemStatusLabels, value);
}

module.exports = {
    orderStatusLabel,
    paymentStatusLabel,
    deliveryStatusLabel,
    driverStatusLabel,
    systemStatusLabel
};
