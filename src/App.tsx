import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { ShoppingBag, User as UserIcon, X, Eye, EyeOff, Trash2, Ruler, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalCart, removeFromLocalCart, updateLocalCartQuantity, addToLocalCart, clearLocalCart, type LocalCartItem } from './lib/cartStorage';
import { shopifyClient, PRODUCT_ID } from './lib/shopify';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        const newUser = session?.user ?? null;
        const prevUser = user;
        setUser(newUser);

        if (newUser && !prevUser) {
          const localItems = getLocalCart();
          if (localItems.length > 0) {
            for (const item of localItems) {
              await supabase.from('cart_items').insert({
                user_id: newUser.id,
                product_name: item.product_name,
                product_price: item.product_price,
                quantity: item.quantity,
                size: item.size,
              });
            }
            clearLocalCart();
          }
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [user]);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };


  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [step, setStep] = useState<'auth' | 'measurements'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [measurements, setMeasurements] = useState({
    waist: '',
    inseam: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  const sizeChart = {
    XS: { waist: '28-30', inseam: '28' },
    S: { waist: '30-32', inseam: '29' },
    M: { waist: '32-34', inseam: '30' },
    L: { waist: '34-36', inseam: '31' },
    XL: { waist: '36-38', inseam: '32' },
  };

  const calculateSuggestedSize = (waist: number, inseam: number): string => {
    for (const [size, measurements] of Object.entries(sizeChart)) {
      const [waistMin, waistMax] = measurements.waist.split('-').map(Number);
      const sizeInseam = Number(measurements.inseam);

      if (
        waist >= waistMin && waist <= waistMax &&
        Math.abs(inseam - sizeInseam) <= 1.5
      ) {
        return size;
      }
    }
    return 'M';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setStep('measurements');
        setLoading(false);
      } else {
        await signIn(email, password);
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleMeasurementsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user && measurements.waist && measurements.inseam) {
        await supabase.from('user_measurements').insert({
          user_id: user.id,
          waist: parseFloat(measurements.waist),
          inseam: parseFloat(measurements.inseam),
        });
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipMeasurements = () => {
    handleClose();
  };

  const handleClose = () => {
    setStep('auth');
    setEmail('');
    setPassword('');
    setMeasurements({ waist: '', inseam: '' });
    setError('');
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-black w-full max-w-md">
        <div className="flex justify-between items-center p-8 border-b border-black">
          <div className="text-xl font-light tracking-widest">
            {step === 'auth'
              ? (isSignUp ? 'SIGN UP' : 'LOG IN')
              : 'YOUR MEASUREMENTS'}
          </div>
          <button
            onClick={handleClose}
            className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {step === 'auth' ? (
          <form onSubmit={handleAuthSubmit} className="p-8 space-y-6">
            {error && (
              <div className="text-red-500 text-sm font-light">{error}</div>
            )}
            <div className="space-y-2">
              <label className="text-sm tracking-wider text-gray-600">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white border border-black p-3 text-black font-light focus:outline-none focus:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm tracking-wider text-gray-600">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white border border-black p-3 pr-12 text-black font-light focus:outline-none focus:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 border border-black hover:bg-black hover:text-white transition-colors tracking-wider font-light disabled:opacity-50"
            >
              {loading ? 'LOADING...' : isSignUp ? 'CONTINUE' : 'LOG IN'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="w-full text-sm tracking-wider text-gray-600 hover:text-black transition-colors"
            >
              {isSignUp ? 'Already have an account? LOG IN' : 'Need an account? SIGN UP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMeasurementsSubmit} className="p-8 space-y-6">
            {error && (
              <div className="text-red-500 text-sm font-light">{error}</div>
            )}
            <p className="text-sm text-gray-600 font-light">
              Enter your measurements to get personalized size recommendations.
            </p>
            <div className="space-y-2">
              <label className="text-sm tracking-wider text-gray-600">WAIST (INCHES)</label>
              <input
                type="number"
                step="0.5"
                value={measurements.waist}
                onChange={(e) => {
                  const newWaist = e.target.value;
                  setMeasurements({ ...measurements, waist: newWaist });
                }}
                className="w-full bg-white border border-black p-3 text-black font-light focus:outline-none focus:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm tracking-wider text-gray-600">INSEAM (INCHES)</label>
              <input
                type="number"
                step="0.5"
                value={measurements.inseam}
                onChange={(e) => {
                  const newInseam = e.target.value;
                  setMeasurements({ ...measurements, inseam: newInseam });
                }}
                className="w-full bg-white border border-black p-3 text-black font-light focus:outline-none focus:border-gray-600"
              />
            </div>
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !measurements.waist || !measurements.inseam}
                className="w-full py-4 border border-black hover:bg-black hover:text-white transition-colors tracking-wider font-light disabled:opacity-50"
              >
                {loading ? 'SAVING...' : 'SAVE MEASUREMENTS'}
              </button>
              <button
                type="button"
                onClick={handleSkipMeasurements}
                className="w-full py-4 border border-black hover:bg-black hover:text-white transition-colors tracking-wider font-light"
              >
                SKIP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface CartItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  size: string;
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  refreshCart: number;
}

function Cart({ isOpen, onClose, onCheckout, refreshCart }: CartProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [localItems, setLocalItems] = useState<LocalCartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      if (user) {
        loadCart();
      } else {
        setLocalItems(getLocalCart());
      }
    }
  }, [isOpen, user, refreshCart]);

  const loadCart = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id);

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const removeItem = async (id: string) => {
    await supabase.from('cart_items').delete().eq('id', id);
    setItems(items.filter(item => item.id !== id));
  };

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity < 1) return;
    await supabase.from('cart_items').update({ quantity }).eq('id', id);
    setItems(items.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const removeLocalItem = (localId: string) => {
    removeFromLocalCart(localId);
    setLocalItems(getLocalCart());
  };

  const updateLocalQuantity = (localId: string, quantity: number) => {
    if (quantity < 1) return;
    updateLocalCartQuantity(localId, quantity);
    setLocalItems(getLocalCart());
  };

  const displayItems = user ? items : localItems;
  const total = user
    ? items.reduce((sum, item) => sum + (item.product_price * item.quantity), 0)
    : localItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);

  return (
    <div className={`fixed top-0 right-0 h-full w-full md:w-96 bg-white border-l border-black z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center p-8 border-b border-black">
          <div className="text-xl font-light tracking-widest">CART</div>
          <button
            onClick={onClose}
            className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400 font-light tracking-wider">LOADING...</div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-gray-400 font-light tracking-wider">
              NO ITEMS
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {user ? items.map((item) => (
                <div key={item.id} className="border border-black p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-light tracking-wider">{item.product_name}</div>
                      <div className="text-sm text-gray-600">SIZE: {item.size}</div>
                      <div className="text-sm">${item.product_price.toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-1 border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      -
                    </button>
                    <span className="font-light">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )) : localItems.map((item) => (
                <div key={item.localId} className="border border-black p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-light tracking-wider">{item.product_name}</div>
                      <div className="text-sm text-gray-600">SIZE: {item.size}</div>
                      <div className="text-sm">${item.product_price.toFixed(2)}</div>
                    </div>
                    <button
                      onClick={() => removeLocalItem(item.localId)}
                      className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updateLocalQuantity(item.localId, item.quantity - 1)}
                      className="px-3 py-1 border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      -
                    </button>
                    <span className="font-light">{item.quantity}</span>
                    <button
                      onClick={() => updateLocalQuantity(item.localId, item.quantity + 1)}
                      className="px-3 py-1 border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-black p-8 space-y-4">
              <div className="flex justify-between text-xl font-light tracking-wider">
                <span>TOTAL</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full py-4 border border-black hover:bg-black hover:text-white transition-colors tracking-wider font-light"
              >
                CHECKOUT
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface CheckoutProps {
  onClose: () => void;
}

function Checkout({ onClose }: CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    handleShopifyCheckout();
  }, []);

  const handleShopifyCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching product:', PRODUCT_ID);
      const product = await shopifyClient.product.fetch(PRODUCT_ID);
      console.log('Product:', product);

      if (!product || !product.variants || product.variants.length === 0) {
        throw new Error('Product not found');
      }

      console.log('Creating checkout...');
      const checkout = await shopifyClient.checkout.create();
      console.log('Checkout created:', checkout.id);

      let items: CartItem[] | LocalCartItem[] = [];

      if (user) {
        const { data } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id);
        items = data || [];
      } else {
        items = getLocalCart();
      }

      console.log('Cart items:', items);

      for (const item of items) {
        const lineItemsToAdd = [
          {
            variantId: product.variants[0].id,
            quantity: item.quantity,
            customAttributes: [
              { key: 'Size', value: item.size }
            ]
          }
        ];

        console.log('Adding line items:', lineItemsToAdd);
        await shopifyClient.checkout.addLineItems(checkout.id, lineItemsToAdd);
      }

      console.log('Redirecting to:', checkout.webUrl);
      window.location.href = checkout.webUrl;
    } catch (error) {
      console.error('Shopify checkout error:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      setError(error instanceof Error ? error.message : JSON.stringify(error));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-32">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-light tracking-wider">CHECKOUT</h1>
          <button
            onClick={onClose}
            className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border border-black p-16 text-center space-y-8">
          <h2 className="text-2xl font-light tracking-wider">
            {error ? 'ERROR' : 'REDIRECTING TO CHECKOUT'}
          </h2>
          {loading && (
            <div className="text-gray-600 font-light tracking-wider">LOADING...</div>
          )}
          {error && (
            <div className="text-red-600 font-light text-sm">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  onAddToCart: () => void;
  onAuthRequired: () => void;
}

function ProductCard({ onAddToCart, onAuthRequired }: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();

  const images = ['/IMG_3003.jpeg', '/IMG_3004.jpeg'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];

  const sizeChart = {
    XS: { waist: '28-30', inseam: '28' },
    S: { waist: '30-32', inseam: '29' },
    M: { waist: '32-34', inseam: '30' },
    L: { waist: '34-36', inseam: '31' },
    XL: { waist: '36-38', inseam: '32' },
  };

  useEffect(() => {
    if (user) {
      loadRecommendedSize();
    } else {
      setRecommendedSize(null);
    }
  }, [user]);

  const loadRecommendedSize = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_measurements')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      const recommended = calculateRecommendedSize(data.waist, data.inseam);
      setRecommendedSize(recommended);
      setSelectedSize(recommended);
    } else {
      setRecommendedSize(null);
    }
  };

  const calculateRecommendedSize = (waist: number, inseam: number): string => {
    for (const [size, measurements] of Object.entries(sizeChart)) {
      const [waistMin, waistMax] = measurements.waist.split('-').map(Number);
      const sizeInseam = Number(measurements.inseam);

      if (
        waist >= waistMin && waist <= waistMax &&
        Math.abs(inseam - sizeInseam) <= 1.5
      ) {
        return size;
      }
    }
    return 'M';
  };

  const handleAddToCart = async () => {
    setLoading(true);

    if (user) {
      await supabase.from('cart_items').insert({
        user_id: user.id,
        product_name: 'SWEATPANTS',
        product_price: 69.99,
        quantity: 1,
        size: selectedSize,
      });
    } else {
      addToLocalCart({
        product_name: 'SWEATPANTS',
        product_price: 69.99,
        quantity: 1,
        size: selectedSize,
      });
    }

    setLoading(false);
    onAddToCart();
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section className="min-h-screen py-32 px-8 border-b border-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-0">
          <div className="relative aspect-square bg-white flex items-center justify-center group">
            <img
              src={images[currentImageIndex]}
              alt="Sweatpants"
              className="w-full h-full object-cover"
              loading="eager"
            />
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 border border-black bg-white hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 border border-black bg-white hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          <div className="flex flex-col justify-center px-12 md:px-16 py-16 border-l border-black">
            <div className="space-y-8">
              <h2 className="text-4xl font-light tracking-wider">SWEATPANTS</h2>
              <p className="text-gray-600 leading-relaxed font-light">
                Precision engineered comfort. Constructed from premium materials with exacting attention to detail.
              </p>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <label className="text-sm tracking-wider text-gray-600">SIZE</label>
                      {recommendedSize && (
                        <div className="text-[8px] tracking-wider text-gray-600">RECCOMENDED SIZE BASED ON YOUR MEASUREMENTS: {recommendedSize}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowSizeChart(!showSizeChart)}
                      className="text-xs tracking-wider text-gray-600 hover:text-black transition-colors flex items-center gap-1"
                    >
                      <Ruler size={14} />
                      SIZE CHART
                    </button>
                  </div>
                  {showSizeChart && (
                    <div className="border border-black p-4 space-y-2 text-sm">
                      <div className="grid grid-cols-3 gap-4 font-light tracking-wider text-gray-600 pb-2 border-b border-gray-300">
                        <div>SIZE</div>
                        <div>WAIST</div>
                        <div>INSEAM</div>
                      </div>
                      {Object.entries(sizeChart).map(([size, measurements]) => (
                        <div key={size} className="grid grid-cols-3 gap-4 font-light">
                          <div>{size}</div>
                          <div>{measurements.waist}"</div>
                          <div>{measurements.inseam}"</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 border transition-colors tracking-wider font-light ${
                          selectedSize === size
                            ? 'bg-black text-white border-black'
                            : 'border-black hover:bg-black hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-light">$69.99</div>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="w-full py-4 border border-black hover:bg-black hover:text-white transition-colors tracking-wider font-light disabled:opacity-50"
                >
                  {loading ? 'ADDING...' : 'ADD TO CART'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<'home' | 'checkout' | 'account'>('home');
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartRefresh, setCartRefresh] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartAnimation, setCartAnimation] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      setCartRefresh(prev => prev + 1);
      setCartAnimation(true);
      setTimeout(() => setCartAnimation(false), 500);
    }
  }, [user]);

  const handleAddToCart = () => {
    setCartRefresh(prev => prev + 1);
    setCartOpen(true);
  };

  const handleCheckout = async () => {
    let total = 0;

    if (user) {
      const { data } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      if (data) {
        total = data.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
      }
    } else {
      const localItems = getLocalCart();
      total = localItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
    }

    setCartTotal(total);
    setCartOpen(false);
    setCurrentPage('checkout');
  };

  const handleCheckoutClose = () => {
    setCurrentPage('home');
    setCartRefresh(prev => prev + 1);
  };

  

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="text-2xl font-light tracking-widest">LUXEN QUALITY</div>
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => setCurrentPage('account')}
                className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
              >
                <UserIcon size={20} />
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
              >
                <UserIcon size={20} />
              </button>
            )}
            <button
              onClick={() => setCartOpen(true)}
              className={`p-2 border border-black hover:bg-black hover:text-white transition-all ${
                cartAnimation ? 'scale-110' : 'scale-100'
              }`}
            >
              <ShoppingBag size={20} />
            </button>
          </div>
        </div>
      </nav>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        refreshCart={cartRefresh}
      />

      {currentPage === 'checkout' ? (
        <main className="pt-20 min-h-screen">
          <Checkout onClose={handleCheckoutClose} />
        </main>
      ) : currentPage === 'account' ? (
        <main className="pt-20 min-h-screen">
          <div className="max-w-2xl mx-auto px-8 py-32">
            <div className="space-y-8">
              <h1 className="text-4xl font-light tracking-wider">ACCOUNT</h1>
              <div className="border border-black p-8 space-y-6">
                <div className="space-y-2">
                  <div className="text-sm tracking-wider text-gray-600">EMAIL</div>
                  <div className="font-light">{user?.email}</div>
                </div>
                <div className="space-y-4 pt-6 border-t border-black">
                  <button
                    onClick={() => setCurrentPage('home')}
                    className="w-full py-3 border border-black hover:bg-black hover:text-white transition-colors tracking-wider font-light"
                  >
                    BACK TO HOME
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setCurrentPage('home');
                    }}
                    className="w-full py-3 border border-black hover:bg-black hover:text-white transition-colors tracking-wider font-light"
                  >
                    SIGN OUT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="pt-20">
        <section className="h-screen flex items-center justify-center border-b border-black">
          <div className="text-center space-y-8">
            <h1 className="text-7xl md:text-9xl font-light tracking-wider">LUXEN</h1>
            <p className="text-xl tracking-widest font-light">QUALITY ELEVATED</p>
          </div>
        </section>

        <ProductCard
          onAddToCart={handleAddToCart}
          onAuthRequired={() => setAuthOpen(true)}
        />

        <section className="min-h-screen flex items-center justify-center py-32 px-8 border-b border-black">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <h2 className="text-5xl font-light tracking-wider">ABOUT</h2>
            <p className="text-gray-600 text-lg leading-loose font-light max-w-2xl mx-auto">
              A vision of uncompromising quality and timeless design.
            </p>
            <div className="grid md:grid-cols-3 gap-px bg-black">
              <div className="bg-white p-12 space-y-4">
                <div className="text-sm tracking-widest text-gray-500">MATERIALS</div>
                <div className="text-xl font-light">PREMIUM</div>
              </div>
              <div className="bg-white p-12 space-y-4">
                <div className="text-sm tracking-widest text-gray-500">CONSTRUCTION</div>
                <div className="text-xl font-light">PRECISE</div>
              </div>
              <div className="bg-white p-12 space-y-4">
                <div className="text-sm tracking-widest text-gray-500">DESIGN</div>
                <div className="text-xl font-light">TIMELESS</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-16 px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-sm tracking-widest text-gray-400 font-light">
              © 2025 LUXEN QUALITY
            </div>
          </div>
        </footer>
      </main>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
