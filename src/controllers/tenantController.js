const prisma = require("../prisma");

exports.update = async (req, res) => {

const { id, name } = req.body;

await prisma.tenant.update({

where: { id },

data: { name }

});

res.redirect("/dashboard");

};
