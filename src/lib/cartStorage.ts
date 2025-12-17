export interface LocalCartItem {
  product_name: string;
  product_price: number;
  quantity: number;
  size: string;
  localId: string;
}

let memoryCart: LocalCartItem[] = [];

export const getLocalCart = (): LocalCartItem[] => {
  try {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  } catch {
    try {
      const cart = sessionStorage.getItem('cart');
      return cart ? JSON.parse(cart) : [];
    } catch {
      return memoryCart;
    }
  }
};

export const saveLocalCart = (items: LocalCartItem[]) => {
  memoryCart = items;
  try {
    localStorage.setItem('cart', JSON.stringify(items));
  } catch {
    try {
      sessionStorage.setItem('cart', JSON.stringify(items));
    } catch {
      console.warn('Unable to save cart to storage, using memory only');
    }
  }
};

const generateUUID = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
    cart.push({ ...item, localId: generateUUID() });
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
  try {
    localStorage.removeItem('cart');
  } catch {
    try {
      sessionStorage.removeItem('cart');
    } catch {
      console.warn('Unable to clear cart from storage');
    }
  }
};
