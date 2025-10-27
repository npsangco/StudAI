// PetBuddy.jsx
import { useState, useEffect, useCallback } from "react";
import { petApi } from "../api/api";
import PetShop from "./PetShop";
import PetInventory from "./PetInventory";

export default function PetBuddy() {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("pet");
  const [actionLoading, setActionLoading] = useState(null);
  
  // Adoption states
  const [choosePet, setChoosePet] = useState(false);
  const [namingPet, setNamingPet] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState(null);
  const [petName, setPetName] = useState("");

  // Load user pet
  const loadPet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await petApi.getPet();
      if (res.data.choosePet) {
        setChoosePet(true);
      } else {
        setPet(res.data);
        setChoosePet(false);
      }
    } catch (err) {
      console.error("Failed to load pet:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPet();
  }, [loadPet]);

  // Smart auto-refresh - only stats, not the whole UI
  useEffect(() => {
    if (!pet) return;

    const getNextRefreshTime = () => {
      const now = new Date();
      const decayIntervals = {
        hunger: 1,      // minutes
        happiness: 1,   // minutes  
        cleanliness: 1, // minutes
        energy: 10      // seconds
      };

      const nextRefreshTimes = [];
      
      // Check when next decay might happen for each stat
      if (pet.last_fed) {
        const lastFed = new Date(pet.last_fed);
        const nextHungerDecay = new Date(lastFed.getTime() + decayIntervals.hunger * 60 * 1000);
        if (nextHungerDecay > now) {
          nextRefreshTimes.push(nextHungerDecay.getTime());
        }
      }

      if (pet.last_played) {
        const lastPlayed = new Date(pet.last_played);
        const nextHappinessDecay = new Date(lastPlayed.getTime() + decayIntervals.happiness * 60 * 1000);
        if (nextHappinessDecay > now) {
          nextRefreshTimes.push(nextHappinessDecay.getTime());
        }
      }

      if (pet.last_cleaned) {
        const lastCleaned = new Date(pet.last_cleaned);
        const nextCleanlinessDecay = new Date(lastCleaned.getTime() + decayIntervals.cleanliness * 60 * 1000);
        if (nextCleanlinessDecay > now) {
          nextRefreshTimes.push(nextCleanlinessDecay.getTime());
        }
      }

      // Check energy replenish
      if (pet.last_updated) {
        const lastUpdated = new Date(pet.last_updated);
        const nextEnergyReplenish = new Date(lastUpdated.getTime() + decayIntervals.energy * 1000);
        if (nextEnergyReplenish > now) {
          nextRefreshTimes.push(nextEnergyReplenish.getTime());
        }
      }

      // Return the earliest time, or default to 30 seconds
      return nextRefreshTimes.length > 0 
        ? Math.min(...nextRefreshTimes) 
        : now.getTime() + 30000;
    };

    const nextRefresh = getNextRefreshTime();
    const timeUntilRefresh = Math.max(nextRefresh - new Date().getTime(), 5000);

    const timeout = setTimeout(() => {
      refreshPetStats();
    }, timeUntilRefresh);

    return () => clearTimeout(timeout);
  }, [pet]);

  // Function to only refresh pet stats
  const refreshPetStats = async () => {
    try {
      const res = await petApi.getPet();
      if (!res.data.choosePet && res.data) {
        setPet(prevPet => ({
          ...prevPet,
          hunger_level: res.data.hunger_level,
          happiness_level: res.data.happiness_level,
          cleanliness_level: res.data.cleanliness_level,
          energy_level: res.data.energy_level,
          experience_points: res.data.experience_points,
          level: res.data.level,
          last_fed: res.data.last_fed,
          last_played: res.data.last_played,
          last_cleaned: res.data.last_cleaned,
          last_updated: res.data.last_updated
        }));
      }
    } catch (err) {
      console.error("Failed to refresh pet stats:", err);
    }
  };

  // Handle pet type selection
  const handlePetSelection = (type) => {
    setSelectedPetType(type);
    setPetName(type === "Dog" ? "Doggo" : "Kitty");
    setChoosePet(false);
    setNamingPet(true);
  };

  // Adopt pet with name
  const createPet = async () => {
    if (!petName.trim()) {
      alert("Please enter a name for your pet!");
      return;
    }

    try {
      const res = await petApi.adopt({
        petType: selectedPetType,
        petName: petName.trim(),
      });
      alert(`You have adopted ${petName.trim()}! 🐾`);
      setPet(res.data);
      setNamingPet(false);
      setSelectedPetType(null);
      setPetName("");
    } catch (err) {
      const message = err.response?.data?.error || "Failed to adopt pet.";
      alert(message);
      if (message.includes("already")) {
        setNamingPet(false);
        setChoosePet(false);
      } else {
        setNamingPet(false);
        setChoosePet(true);
      }
    }
  };

  // Update pet name
  const updatePetName = async (newName) => {
    if (!newName.trim()) {
      alert("Please enter a name for your pet!");
      return false;
    }

    try {
      const res = await petApi.updateName(newName.trim());
      setPet(res.data);
      alert(`Pet name updated to ${newName.trim()}!`);
      return true;
    } catch (err) {
      alert("Failed to update pet name.", err);
      return false;
    }
  };

  // Pet actions
  const handleAction = async (type) => {
    const statMap = {
      feed: "hunger_level",
      play: "happiness_level",
      clean: "cleanliness_level",
    };

    const statKey = statMap[type];
    const currentValue = pet?.[statKey];

    if (currentValue !== undefined && currentValue >= 100) {
      console.log(`⚠️ ${type} skipped — ${statKey} is already maxed.`);
      return;
    }

    setActionLoading(type);
    try {
      const res = await petApi.doAction({
        actionType: type,
      });

      setPet(res.data);
    } catch (err) {
      console.error("Action failed:", err);
      const errorMsg = err.response?.data?.error || "Action failed!";
      if (errorMsg.includes("No") && errorMsg.includes("equipped")) {
        setActiveView("shop");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleItemUse = (updatedPet) => {
    setPet(updatedPet);
    setActiveView("pet");
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-3xl shadow-lg w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
        <p>Loading pet...</p>
      </div>
    );
  }

  if (choosePet) {
    return <PetSelection onSelectPet={handlePetSelection} />;
  }

  if (namingPet) {
    return (
      <PetNaming
        selectedPetType={selectedPetType}
        petName={petName}
        onNameChange={setPetName}
        onCreate={createPet}
        onBack={() => {
          setNamingPet(false);
          setChoosePet(true);
        }}
      />
    );
  }

  if (!pet) return (
    <div className="p-8 bg-white rounded-3xl shadow-lg text-center w-full max-w-md mx-auto">
      <p>No pet data found.</p>
    </div>
  );

  // Show different views
  if (activeView === "shop") {
    return <PetShop onClose={() => setActiveView("pet")} />;
  }

  if (activeView === "inventory") {
    return (
      <PetInventory 
        onClose={() => setActiveView("pet")}
        onUseItem={handleItemUse}
      />
    );
  }

  // Main Pet View
  return (
    <div className="p-6 bg-white rounded-3xl shadow-lg w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      <PetHeader 
        pet={pet} 
        onUpdateName={updatePetName}
        onShop={() => setActiveView("shop")}
        onInventory={() => setActiveView("inventory")}
      />
      
      <PetImage pet={pet} />

      <PetStats pet={pet} onRefresh={refreshPetStats} />
      
      <PetActions 
        onAction={handleAction}
        actionLoading={actionLoading}
      />
    </div>
  );
}

// Extracted Components
const PetSelection = ({ onSelectPet }) => (
  <div className="p-8 bg-white rounded-3xl shadow-lg text-center w-full max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold mb-4 text-gray-800">Choose your Pet Companion 🐾</h2>
    <p className="text-sm text-gray-500 mb-6">This choice is permanent! Choose wisely.</p>
    <div className="flex justify-center gap-8">
      <button
        onClick={() => onSelectPet("Dog")}
        className="flex flex-col items-center p-6 rounded-2xl border-2 border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group"
      >
        <span className="text-6xl group-hover:scale-110 transition-transform mb-3">🐶</span>
        <span className="font-semibold text-gray-700">Dog</span>
        <p className="text-xs text-gray-500 mt-2 max-w-[120px]">Loyal, energetic, and always hungry!</p>
      </button>
      <button
        onClick={() => onSelectPet("Cat")}
        className="flex flex-col items-center p-6 rounded-2xl border-2 border-transparent hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 group"
      >
        <span className="text-6xl group-hover:scale-110 transition-transform mb-3">🐱</span>
        <span className="font-semibold text-gray-700">Cat</span>
        <p className="text-xs text-gray-500 mt-2 max-w-[120px]">Independent, clean, and loves to play!</p>
      </button>
    </div>
  </div>
);

const PetNaming = ({ selectedPetType, petName, onNameChange, onCreate, onBack }) => (
  <div className="p-8 bg-white rounded-3xl shadow-lg text-center w-full max-w-md mx-auto">
    <div className="text-6xl mb-4">
      {selectedPetType === "Dog" ? "🐶" : "🐱"}
    </div>
    <h2 className="text-2xl font-bold mb-2 text-gray-800">Name your {selectedPetType}!</h2>
    <p className="text-sm text-gray-500 mb-6">Give your new friend a wonderful name</p>
    
    <div className="mb-6">
      <input
        type="text"
        value={petName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={`Enter ${selectedPetType} name...`}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
        maxLength={20}
        autoFocus
      />
      <p className="text-xs text-gray-400 mt-2 text-right">{petName.length}/20 characters</p>
    </div>
    
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="flex-1 py-3 px-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
      >
        ← Back
      </button>
      <button
        onClick={onCreate}
        className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold"
      >
        Adopt!
      </button>
    </div>
  </div>
);

const Navigation = ({ onShop, onInventory }) => (
  <div className="flex gap-2">
    <button
      onClick={onShop}
      className="bg-yellow-500 text-white p-2 rounded-lg hover:bg-yellow-600 transition-colors group relative"
      title="Shop"
    >
      <span className="text-xl">🛒</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Shop
      </span>
    </button>
    <button
      onClick={onInventory}
      className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors group relative"
      title="Inventory"
    >
      <span className="text-xl">🎒</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Inventory
      </span>
    </button>
  </div>
);

const PetHeader = ({ pet, onUpdateName, onShop, onInventory }) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(pet.pet_name);

  const handleSave = async () => {
    const success = await onUpdateName(tempName);
    if (success) setEditingName(false);
  };

  const handleCancel = () => {
    setTempName(pet.pet_name);
    setEditingName(false);
};

return (
    <div className="relative flex items-center justify-center mb-4">
      {/* Centered Name */}
      <div className="text-center">
        {editingName ? (
          <div className="flex items-center justify-center gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-xl font-bold text-center w-32"
              autoFocus
              maxLength={20}
            />
            <button
              onClick={handleSave}
              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 text-sm"
            >
              ✗
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h2 className="font-bold text-xl">{pet.pet_name}</h2>
            <button
              onClick={() => {
                setTempName(pet.pet_name);
                setEditingName(true);
              }}
              className="text-gray-400 hover:text-blue-500 transition-colors text-sm"
              title="Edit name"
            >
              ✏️
            </button>
          </div>
        )}
      </div>

      {/* Shop + Inventory Buttons on the Right */}
      <div className="absolute right-0 flex gap-2">
        <button
          onClick={onShop}
          className="bg-yellow-500 text-white p-2 rounded-lg hover:bg-yellow-600 transition-colors"
          title="Shop"
        >
          🛒
        </button>
        <button
          onClick={onInventory}
          className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
          title="Inventory"
        >
          🎒
        </button>
      </div>
    </div>
  );
};

const PetImage = ({ pet }) => (
  <img 
    src={pet.pet_type === "Dog" ? "/dog.gif" : "/cat.gif"} 
    alt={pet.pet_type}
    className="w-48 h-48 mx-auto p-4"
    loading="lazy"
  />
);

// Updated PetStats component with its own refresh logic
const PetStats = ({ pet }) => {
  const [localPet, setLocalPet] = useState(pet);
  
  // Update local pet when prop changes
  useEffect(() => {
    setLocalPet(pet);
  }, [pet]);

  const getStatColor = (value) => {
    if (value >= 70) return "from-green-400 to-green-600";
    if (value >= 40) return "from-yellow-400 to-yellow-600";
    if (value >= 20) return "from-orange-400 to-orange-600";
    return "from-red-400 to-red-600";
  };

  const expNeeded = Math.floor(100 * Math.pow(1.1, localPet.level - 1));
  const expPercent = (localPet.experience_points / expNeeded) * 100;

  return (
    <div className="mt-4 space-y-3">
      {["hunger", "happiness", "cleanliness", "energy"].map((stat) => {
        const value = localPet[`${stat}_level`];
        return (
          <div key={stat}>
            <div className="flex justify-between text-sm">
              <span className="capitalize">{stat}</span>
              <span className={value < 20 ? "text-red-600 font-bold" : ""}>
                {value}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-3 rounded-full">
              <div
                className={`h-3 rounded-full bg-gradient-to-r ${getStatColor(value)}`}
                style={{ width: `${value}%` }}
              ></div>
            </div>
          </div>
        );
      })}

      {/* Exp Bar */}
      <div>
        <p className="text-sm">EXP: {localPet.experience_points}/{expNeeded}</p>
        <div className="w-full bg-gray-200 h-3 rounded-full">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600"
            style={{ width: `${expPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Low Stat Warning */}
      {(localPet.hunger_level < 20 || localPet.happiness_level < 20 || 
        localPet.cleanliness_level < 20 || localPet.energy_level < 20) && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm font-medium">
            ⚠️ Your pet needs attention!
          </p>
        </div>
      )}
    </div>
  );
};

const PetActions = ({ onAction, actionLoading }) => (
  <div className="grid grid-cols-3 gap-3 mt-6">
    <button
      onClick={() => onAction("feed")}
      disabled={actionLoading !== null}
      className={`bg-green-500 text-white py-2 rounded-lg transition-all ${
        actionLoading === "feed" 
          ? "opacity-50 cursor-wait" 
          : actionLoading 
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-green-600"
      }`}
    >
      {actionLoading === "feed" ? "Feeding..." : "Feed"}
    </button>
    <button
      onClick={() => onAction("play")}
      disabled={actionLoading !== null}
      className={`bg-yellow-500 text-white py-2 rounded-lg transition-all ${
        actionLoading === "play" 
          ? "opacity-50 cursor-wait" 
          : actionLoading 
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-yellow-600"
      }`}
    >
      {actionLoading === "play" ? "Playing..." : "Play"}
    </button>
    <button
      onClick={() => onAction("clean")}
      disabled={actionLoading !== null}
      className={`bg-blue-500 text-white py-2 rounded-lg transition-all ${
        actionLoading === "clean" 
          ? "opacity-50 cursor-wait" 
          : actionLoading 
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-blue-600"
      }`}
    >
      {actionLoading === "clean" ? "Cleaning..." : "Clean"}
    </button>
  </div>
);