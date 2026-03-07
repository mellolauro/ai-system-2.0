const prisma = require("../prisma");

exports.list = async (req, res) => {

const products = await prisma.product.findMany({
include: { images: true }
});

res.render("products", { products });

};

exports.create = async (req, res) => {

const { name, description, price, stock, tenantId } = req.body;

const product = await prisma.product.create({

data: {
name,
description,
price: parseFloat(price),
stock: parseInt(stock),
tenantId
}

});

if (req.file) {

await prisma.productImage.create({

data: {
url: "/uploads/products/" + req.file.filename,
productId: product.id
}

});

}

res.redirect("/products");

};
