// PetShop.jsx - Optimized with Quantity Input
import { useState, useEffect } from "react";
import { petApi } from "../api/api";

export default function PetShop({ onClose, onItemPurchase }) {
  const [items, setItems] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({});

  const loadShopData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load shop items
      const itemsRes = await petApi.getShopItems();
      setItems(itemsRes.data.items || []);

      // Initialize quantities to 1
      const initialQuantities = {};
      itemsRes.data.items.forEach(item => {
        initialQuantities[item.item_id] = 1;
      });
      setQuantities(initialQuantities);

      // Load user points
      const userRes = await petApi.getUserProfile();
      setUserPoints(userRes.data.points || 0);
    } catch (err) {
      console.error("Failed to load shop data:", err);
      setError("Failed to load shop data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShopData();
  }, []);

  // Handle quantity change
  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
  };

  // Handle item purchase
  const handlePurchase = async (itemId) => {
    if (purchasing) return;

    const quantity = quantities[itemId] || 1;
    const item = items.find(i => i.item_id === itemId);
    const totalCost = item.cost * quantity;

    if (userPoints < totalCost) {
      alert(`Not enough points! You need ${totalCost} but have ${userPoints}.`);
      return;
    }

    setPurchasing(itemId);
    try {
      // Purchase multiple items
      for (let i = 0; i < quantity; i++) {
        await petApi.purchaseItem({
          itemId,
        });
      }

      await loadShopData();
      onItemPurchase && onItemPurchase();
      
    } catch (err) {
      const message = err.response?.data?.error || "Purchase failed.";
      alert(message);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-3xl shadow-lg text-center w-full max-w-2xl mx-auto">
        <p>Loading shop...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-3xl shadow-lg text-center w-full max-w-2xl mx-auto">
        <p className="text-red-600 font-semibold">{error}</p>
        <button
          onClick={loadShopData}
          className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-3xl shadow-lg w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Pet Shop</h2>
        <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
          <span className="text-yellow-800 font-semibold">Points:</span>
          <span className="text-yellow-900 font-bold">{userPoints}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-lg font-bold"
        >
          ✕
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <ShopItem 
            key={item.item_id}
            item={item}
            userPoints={userPoints}
            purchasing={purchasing}
            quantity={quantities[item.item_id] || 1}
            onQuantityChange={handleQuantityChange}
            onPurchase={handlePurchase}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No items available in the shop.</p>
        </div>
      )}
    </div>
  );
}

// Extracted Shop Item Component
const ShopItem = ({ item, userPoints, purchasing, quantity, onQuantityChange, onPurchase }) => {
  const totalCost = item.cost * quantity;
  const canAfford = userPoints >= totalCost;

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-4 hover:border-blue-300 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800">{item.item_name}</h3>
          <p className="text-sm text-gray-600">{item.item_description}</p>
        </div>
        <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
          <span className="text-green-800 font-semibold">{item.cost}</span>
          <span className="text-green-600">⭐</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        <span className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {item.item_type || "Misc"}
        </span>
        <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded">
          {item.effect_type}: +{item.effect_value}
        </span>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">Quantity:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(item.item_id, quantity - 1)}
            disabled={quantity <= 1}
            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-gray-300"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => onQuantityChange(item.item_id, parseInt(e.target.value) || 1)}
            min="1"
            max="99"
            className="w-16 text-center border border-gray-300 rounded py-1"
          />
          <button
            onClick={() => onQuantityChange(item.item_id, quantity + 1)}
            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
          >
            +
          </button>
        </div>
      </div>

      {/* Total Cost */}
      {quantity > 1 && (
        <div className="text-sm text-gray-600 mb-3 text-center">
          Total: <span className="font-semibold">{totalCost} points</span>
        </div>
      )}

      <button
        onClick={() => onPurchase(item.item_id)}
        disabled={!canAfford || purchasing === item.item_id}
        className={`w-full py-2 rounded-lg font-semibold transition-all ${
          !canAfford
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : purchasing === item.item_id
            ? "bg-blue-400 text-white cursor-wait"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {!canAfford
          ? `Need ${totalCost - userPoints} more points`
          : purchasing === item.item_id
          ? "Purchasing..."
          : `Buy ${quantity > 1 ? quantity + ' ' : ''}Now`}
      </button>
    </div>
  );
};