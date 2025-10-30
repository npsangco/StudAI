// PetShop.jsx - Optimized Point Reloading with Auto-Dismiss Alerts
import { useState, useEffect } from "react";
import { petApi } from "../api/api";
import { X } from "lucide-react";

// Alert
const Alert = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-[60] animate-slide-in">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg flex items-center gap-3 max-w-sm">
        <div className="flex-1">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default function PetShop({ onClose, onItemPurchase }) {
  const [items, setItems] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [error, setError] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [alerts, setAlerts] = useState([]);

  const addAlert = (message) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message }]);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const loadShopData = async () => {
    setLoading(true);
    setError(null);

    try {
      const itemsRes = await petApi.getShopItems();
      setItems(itemsRes.data.items || []);

      // Initialize quantities to 1
      const initialQuantities = {};
      itemsRes.data.items.forEach(item => {
        initialQuantities[item.item_id] = 1;
      });
      setQuantities(initialQuantities);

      const userRes = await petApi.getUserProfile();
      setUserPoints(userRes.data.points || 0);
    } catch (err) {
      console.error("Failed to load shop data:", err);
      setError("Failed to load shop data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load only user points (optimized)
  const loadUserPoints = async () => {
    try {
      const userRes = await petApi.getUserProfile();
      setUserPoints(userRes.data.points || 0);
    } catch (err) {
      console.error("Failed to load user points:", err);
    }
  };

  useEffect(() => {
    loadShopData();
  }, []);

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setQuantities(prev => ({
      ...prev,
      [itemId]: newQuantity
    }));
  };

  const handlePurchase = async (itemId) => {
    if (purchasing) return;

    const quantity = quantities[itemId] || 1;
    const item = items.find(i => i.item_id === itemId);
    const totalCost = item.cost * quantity;

    if (userPoints < totalCost) {
      setAlerts([]);
      addAlert(`Not enough points! Need ${totalCost}, have ${userPoints}.`);
      return;
    }

    setPurchasing(itemId);
    try {
      for (let i = 0; i < quantity; i++) {
        await petApi.purchaseItem({ itemId });
      }

      // Only reload points, not the entire shop
      await loadUserPoints();
      onItemPurchase && onItemPurchase();
      
      setAlerts([]);
      addAlert(`Successfully purchased ${quantity}x ${item.item_name}!`);
      
    } catch (err) {
      const message = err.response?.data?.error || "Purchase failed.";
      setAlerts([]);
      addAlert(message);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl text-center">
          <p>Loading shop...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl text-center">
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            onClick={loadShopData}
            className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Alerts */}
      {alerts.map(alert => (
        <Alert 
          key={alert.id} 
          message={alert.message} 
          onDismiss={() => removeAlert(alert.id)}
        />
      ))}

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          {/* Compact Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Pet Shop 🛒</h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1.5 rounded-full flex-1 sm:flex-initial justify-center">
                <span className="text-xs sm:text-sm text-yellow-800 font-semibold">Points:</span>
                <span className="text-sm sm:text-base text-yellow-900 font-bold">{userPoints}</span>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <CompactShopItem 
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
              <p className="text-sm">No items available in the shop.</p>
            </div>
          )}
        </div>
        
        {/* Scrollbar hide styles */}
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @keyframes slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </>
  );
}

// Compact Shop Item Component
const CompactShopItem = ({ item, userPoints, purchasing, quantity, onQuantityChange, onPurchase }) => {
  const totalCost = item.cost * quantity;
  const canAfford = userPoints >= totalCost;

  return (
    <div className="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-800 truncate">{item.item_name}</h3>
          <p className="text-xs text-gray-600 line-clamp-2">{item.item_description}</p>
        </div>
        <div className="flex items-center gap-1 bg-green-100 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
          <span className="text-xs text-green-800 font-semibold">{item.cost}</span>
          <span className="text-xs text-green-600">⭐</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
          {item.effect_type}: +{item.effect_value}
        </span>
      </div>

      {/* Compact Quantity Selector */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-600">Qty:</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQuantityChange(item.item_id, quantity - 1)}
            disabled={quantity <= 1}
            className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-gray-300 text-sm"
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => onQuantityChange(item.item_id, parseInt(e.target.value) || 1)}
            min="1"
            max="99"
            className="w-12 text-center border border-gray-300 rounded py-0.5 text-xs"
          />
          <button
            onClick={() => onQuantityChange(item.item_id, quantity + 1)}
            className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 text-sm"
          >
            +
          </button>
        </div>
      </div>

      {/* Total Cost */}
      {quantity > 1 && (
        <div className="text-xs text-gray-600 mb-2 text-center">
          Total: <span className="font-semibold">{totalCost} pts</span>
        </div>
      )}

      <button
        onClick={() => onPurchase(item.item_id)}
        disabled={!canAfford || purchasing === item.item_id}
        className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
          !canAfford
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : purchasing === item.item_id
            ? "bg-blue-400 text-white cursor-wait"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {!canAfford
          ? `Need ${totalCost - userPoints} more`
          : purchasing === item.item_id
          ? "Buying..."
          : `Buy ${quantity > 1 ? quantity + 'x' : ''}`}
      </button>
    </div>
  );
};