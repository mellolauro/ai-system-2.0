const prisma = require("../../prisma");

module.exports = async ({ id }) => {

    return prisma.customer.findUnique({

        where: {

            id

        }

    });

};
