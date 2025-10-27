// PetInventory.jsx
import { useState, useEffect } from "react";
import { petApi } from "../api/api";

export default function PetInventory({ onClose, onUseItem }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingItem, setUsingItem] = useState(null);
  const [error, setError] = useState(null);

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
          // Reload inventory after auto-equip
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

  // Equip / Unequip items
  const toggleEquip = async (inventoryId, isEquipped) => {
    try {
      await petApi.toggleEquip({
        inventoryId,
        isEquipped,
      });
      await loadInventory();
    } catch {
      alert("Failed to update equipment status.");
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
      alert("Item used successfully!");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to use item.";
      alert(msg);
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
    hunger: 'Food Items',
    happiness: 'Toys',
    cleanliness: 'Cleaning Items',
    energy: '⚡ Energy Items'
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-3xl shadow-lg text-center">
        <p>Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-3xl shadow-lg text-center">
        <p className="text-red-600 font-semibold">{error}</p>
        <button
          onClick={loadInventory}
          className="mt-3 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-3xl shadow-lg max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-lg font-bold">
          ✕
        </button>
      </div>

      {/* Help Section */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
        <h3 className="font-bold text-blue-900 mb-2">How Equipped Items Work:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Equip items to use them automatically when you click Feed, Play, or Clean</li>
          <li>You can equip <strong>multiple items</strong> of the same type</li>
          <li>The system will use the <strong>highest effect items first</strong></li>
          <li>When near 100%, it will use items with appropriate effect values</li>
          <li>Items are automatically removed from inventory after use</li>
        </ul>
      </div>

      {inventory.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Your inventory is empty.</p>
          <p className="text-sm">Visit the shop to buy some items!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedInventory).map(([effectType, items]) => (
            <div key={effectType} className="bg-gray-50 p-4 rounded-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                {effectTypeLabels[effectType] || effectType}
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({items.filter(i => i.is_equipped).length} equipped)
                </span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <InventoryItem 
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
  );
}

// Extracted Inventory Item Component
const InventoryItem = ({ item, usingItem, onToggleEquip, onUseItem }) => (
  <div className={`border-2 rounded-2xl p-4 transition-all duration-300 ${
    item.is_equipped 
      ? "border-indigo-400 bg-indigo-50 shadow-md" 
      : "border-gray-200 hover:border-green-300"
  }`}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <h4 className="font-bold text-lg text-gray-800">{item.item_name}</h4>
        <p className="text-sm text-gray-600">{item.item_description}</p>
      </div>
      <div className="bg-gray-100 px-3 py-1 rounded-full">
        <span className="text-gray-800 font-semibold">×{item.quantity}</span>
      </div>
    </div>

    <div className="text-xs text-gray-500 mb-3 flex flex-wrap gap-2">
      <span className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded">
        {item.item_type}
      </span>
      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
        {item.effect_type}: +{item.effect_value}
      </span>
      {item.is_equipped && (
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
          ✓ Equipped
        </span>
      )}
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => onUseItem(item.inventory_id, item.item_id)}
        disabled={usingItem === item.inventory_id}
        className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
          usingItem === item.inventory_id
            ? "bg-green-400 text-white cursor-wait"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {usingItem === item.inventory_id ? "Using..." : "Use Now"}
      </button>

      <button
        onClick={() => onToggleEquip(item.inventory_id, item.is_equipped)}
        className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
          item.is_equipped
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-gray-400 text-white hover:bg-gray-500"
        }`}
      >
        {item.is_equipped ? "✓ Equipped" : "Equip"}
      </button>
    </div>
  </div>
);