import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('medifind_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [cartPharmacy, setCartPharmacy] = useState(() => {
    try {
      const saved = localStorage.getItem('medifind_cart_pharmacy');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('medifind_cart', JSON.stringify(cartItems));
      localStorage.setItem('medifind_cart_pharmacy', JSON.stringify(cartPharmacy));
    } catch (e) {
      console.error('Cart localStorage save error:', e);
    }
  }, [cartItems, cartPharmacy]);

  // Add item to cart
  const addToCart = (medicine, pharmacy) => {
    const medId = medicine._id || medicine.id || medicine.medicineId;
    const phId = pharmacy._id || pharmacy.id || pharmacy.pharmacyId;

    // If adding from a different pharmacy, prompt to clear previous pharmacy cart
    if (cartPharmacy && cartPharmacy.id && String(cartPharmacy.id) !== String(phId)) {
      const confirmChange = window.confirm(
        `Your cart currently contains medicines from '${cartPharmacy.name}'. Adding items from '${pharmacy.shopName || pharmacy.name}' will clear your current cart. Proceed?`
      );
      if (!confirmChange) return;

      // Reset cart for new pharmacy
      setCartItems([{
        medicineId: medId,
        name: medicine.name,
        genericName: medicine.genericName,
        dosageForm: medicine.dosageForm,
        strength: medicine.strength,
        brand: medicine.brand || medicine.manufacturer,
        price: Number(medicine.price),
        discount: Number(medicine.discount || 0),
        prescriptionRequired: medicine.prescriptionRequired || false,
        quantity: 1,
        maxStock: Number(medicine.stock || 10)
      }]);

      setCartPharmacy({
        id: phId,
        name: pharmacy.shopName || pharmacy.name,
        address: pharmacy.address
      });

      setIsCartOpen(true);
      return;
    }

    // Set pharmacy if first item
    if (!cartPharmacy) {
      setCartPharmacy({
        id: phId,
        name: pharmacy.shopName || pharmacy.name,
        address: pharmacy.address
      });
    }

    setCartItems(prev => {
      const existing = prev.find(item => String(item.medicineId) === String(medId));
      if (existing) {
        return prev.map(item =>
          String(item.medicineId) === String(medId)
            ? { ...item, quantity: Math.min(item.maxStock, item.quantity + 1) }
            : item
        );
      } else {
        return [...prev, {
          medicineId: medId,
          name: medicine.name,
          genericName: medicine.genericName,
          dosageForm: medicine.dosageForm,
          strength: medicine.strength,
          brand: medicine.brand || medicine.manufacturer,
          price: Number(medicine.price),
          discount: Number(medicine.discount || 0),
          prescriptionRequired: medicine.prescriptionRequired || false,
          quantity: 1,
          maxStock: Number(medicine.stock || 10)
        }];
      }
    });

    setIsCartOpen(true);
  };

  // Update quantity
  const updateQuantity = (medicineId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(medicineId);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        String(item.medicineId) === String(medicineId)
          ? { ...item, quantity: Math.min(item.maxStock, newQty) }
          : item
      )
    );
  };

  // Remove single item
  const removeFromCart = (medicineId) => {
    setCartItems(prev => {
      const updated = prev.filter(item => String(item.medicineId) !== String(medicineId));
      if (updated.length === 0) {
        setCartPharmacy(null);
      }
      return updated;
    });
  };

  // Clear entire cart
  const clearCart = () => {
    setCartItems([]);
    setCartPharmacy(null);
  };

  // Calculated metrics
  const cartTotal = cartItems.reduce((sum, item) => {
    const discountedPrice = item.price * (1 - (item.discount || 0) / 100);
    return sum + (discountedPrice * item.quantity);
  }, 0);

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const hasPrescriptionItems = cartItems.some(item => item.prescriptionRequired);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartPharmacy,
        cartTotal,
        cartCount,
        hasPrescriptionItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
