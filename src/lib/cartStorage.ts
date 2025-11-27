export interface LocalCartItem {
  product_name: string;
  product_price: number;
  quantity: number;
  size: string;
  localId: string;
}

export const getLocalCart = (): LocalCartItem[] => {
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
};

export const saveLocalCart = (items: LocalCartItem[]) => {
  localStorage.setItem('cart', JSON.stringify(items));
};

export const addToLocalCart = (item: Omit<LocalCartItem, 'localId'>) => {
  const cart = getLocalCart();
  const existingItem = cart.find(
    i => i.product_name === item.product_name && i.size === item.size
  );

  if (existingItem) {
    existingItem.quantity += item.quantity;
  } else {
    cart.push({ ...item, localId: crypto.randomUUID() });
  }

  saveLocalCart(cart);
};

export const removeFromLocalCart = (localId: string) => {
  const cart = getLocalCart();
  saveLocalCart(cart.filter(item => item.localId !== localId));
};

export const updateLocalCartQuantity = (localId: string, quantity: number) => {
  const cart = getLocalCart();
  const item = cart.find(i => i.localId === localId);
  if (item) {
    item.quantity = quantity;
    saveLocalCart(cart);
  }
};

export const clearLocalCart = () => {
  localStorage.removeItem('cart');
};
