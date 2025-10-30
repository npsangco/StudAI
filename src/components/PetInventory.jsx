// PetInventory.jsx - With Auto-Dismiss Alerts
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

export default function PetInventory({ onClose, onUseItem }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingItem, setUsingItem] = useState(null);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const addAlert = (message) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message }]);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await petApi.getInventory();
      
      const inventory = res.data.inventory || [];
      
      // Auto-equip first items if user has no equipped items
      const hasEquippedItems = inventory.some(item => item.is_equipped);
      if (!hasEquippedItems && inventory.length > 0) {
        try {
          await petApi.autoEquip();
          const updatedRes = await petApi.getInventory();
          setInventory(updatedRes.data.inventory || []);
        } catch (equipError) {
          console.log("Auto-equip failed, using original inventory", equipError);
          setInventory(inventory);
        }
      } else {
        setInventory(inventory);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setError("Failed to load inventory. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const toggleEquip = async (inventoryId, isEquipped) => {
    try {
      await petApi.toggleEquip({
        inventoryId,
        isEquipped,
      });
      await loadInventory();
      setAlerts([]);
      addAlert(isEquipped ? "Item unequipped!" : "Item equipped!");
    } catch {
      setAlerts([]);
      addAlert("Failed to update equipment status.");
    }
  };

  const handleUseItem = async (inventoryId, itemId) => {
    if (usingItem) return;
    setUsingItem(inventoryId);
    try {
      const res = await petApi.useItem({
        inventoryId,
        itemId,
      });
      onUseItem && onUseItem(res.data.updatedPet);
      await loadInventory();
      addAlert("Item used successfully!");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to use item.";
      addAlert(msg);
    } finally {
      setUsingItem(null);
    }
  };

  // Group items by effect type
  const groupedInventory = inventory.reduce((acc, item) => {
    const type = item.effect_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const effectTypeLabels = {
    hunger: '🍖 Food',
    happiness: '🎾 Toys',
    cleanliness: '🧼 Clean',
    energy: '⚡ Energy'
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
          <p className="text-center">Loading inventory...</p>
        </div>
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl text-center">
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            onClick={loadInventory}
            className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Retry
          </button>
        </div>
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Inventory 🎒</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">
              ✕
            </button>
          </div>

          {/* Compact Help Section */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs sm:text-sm text-blue-800">
              💡 <strong>Tip:</strong> Equip items to auto-use when clicking Feed/Play/Clean. Multiple items can be equipped!
            </p>
          </div>

          {inventory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Your inventory is empty.</p>
              <p className="text-xs mt-2">Visit the shop to buy items!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedInventory).map(([effectType, items]) => (
                <div key={effectType} className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2">
                    {effectTypeLabels[effectType] || effectType}
                    <span className="ml-2 text-xs font-normal text-gray-600">
                      ({items.filter(i => i.is_equipped).length} equipped)
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((item) => (
                      <CompactInventoryItem 
                        key={item.inventory_id}
                        item={item}
                        usingItem={usingItem}
                        onToggleEquip={toggleEquip}
                        onUseItem={handleUseItem}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Add this style tag at the end */}
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

// Compact Inventory Item Component
const CompactInventoryItem = ({ item, usingItem, onToggleEquip, onUseItem }) => (
  <div className={`border-2 rounded-lg p-3 transition-all ${
    item.is_equipped 
      ? "border-indigo-400 bg-indigo-50" 
      : "border-gray-200 hover:border-green-300"
  }`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-gray-800 truncate">{item.item_name}</h4>
        <p className="text-xs text-gray-600 line-clamp-1">{item.item_description}</p>
      </div>
      <div className="bg-gray-100 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
        <span className="text-xs text-gray-800 font-semibold">×{item.quantity}</span>
      </div>
    </div>

    <div className="flex flex-wrap gap-1 mb-2">
      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
        +{item.effect_value}
      </span>
      {item.is_equipped && (
        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">
          ✓ Equipped
        </span>
      )}
    </div>

    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onUseItem(item.inventory_id, item.item_id)}
        disabled={usingItem === item.inventory_id}
        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
          usingItem === item.inventory_id
            ? "bg-green-400 text-white cursor-wait"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {usingItem === item.inventory_id ? "..." : "Use"}
      </button>

      <button
        onClick={() => onToggleEquip(item.inventory_id, item.is_equipped)}
        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
          item.is_equipped
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-gray-400 text-white hover:bg-gray-500"
        }`}
      >
        {item.is_equipped ? "Equipped" : "Equip"}
      </button>
    </div>
  </div>
);