const prisma = require("../../prisma");

module.exports = async ({

    model,

    where = {},

    select = {}

}) => {

    if (!prisma[model]) {

        throw new Error("Modelo inexistente.");

    }

    return prisma[model].findMany({

        where,

        select

    });

};
