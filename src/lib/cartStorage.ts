export interface LocalCartItem {
  product_name: string;
  product_price: number;
  quantity: number;
  size: string;
  localId: string;
}

let memoryCart: LocalCartItem[] = [];

const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const getLocalCart = (): LocalCartItem[] => {
  if (!isStorageAvailable()) {
    return memoryCart;
  }
  try {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  } catch {
    return memoryCart;
  }
};

export const saveLocalCart = (items: LocalCartItem[]) => {
  memoryCart = items;
  if (!isStorageAvailable()) {
    return;
  }
  try {
    localStorage.setItem('cart', JSON.stringify(items));
  } catch {
    console.warn('Unable to save cart to localStorage');
  }
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
  memoryCart = [];
  if (!isStorageAvailable()) {
    return;
  }
  try {
    localStorage.removeItem('cart');
  } catch {
    console.warn('Unable to clear cart from localStorage');
  }
};
