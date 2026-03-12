function getCart(session) {
  if (!session.cart) {
    session.cart = { items: [] }
  }
  return session.cart
}

function addItem(session, product) {
  const cart = getCart(session)

  const item = cart.items.find(i => i.productId === product.id)

  if (item) {
    item.qty += 1
  } else {
    cart.items.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    })
  }

  return cart
}

function removeItem(session, productId) {
  const cart = getCart(session)

  cart.items = cart.items.filter(i => i.productId !== productId)

  return cart
}

function clearCart(session) {
  session.cart = { items: [] }
}

function getTotal(session) {
  const cart = getCart(session)

  return cart.items.reduce((total, item) => {
    return total + item.price * item.qty
  }, 0)
}

module.exports = {
  getCart,
  addItem,
  removeItem,
  clearCart,
  getTotal
}
