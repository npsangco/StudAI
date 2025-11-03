// PetBuddy.jsx - With Auto-Dismiss Alerts
import { useState, useEffect, useCallback } from "react";
import { petApi } from "../api/api";
import { X } from "lucide-react";
import PetShop from "./PetShop";
import PetInventory from "./PetInventory";

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

export default function PetBuddy() {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("pet");
  const [actionLoading, setActionLoading] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  // Adoption states
  const [choosePet, setChoosePet] = useState(false);
  const [namingPet, setNamingPet] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState(null);
  const [petName, setPetName] = useState("");

  const addAlert = (message) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message }]);
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

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

  // Smart auto-refresh
  useEffect(() => {
    if (!pet) return;

    const timeout = setTimeout(() => {
      refreshPetStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearTimeout(timeout);
  }, [pet]);

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

  const handlePetSelection = (type) => {
    setSelectedPetType(type);
    setPetName(type === "Dog" ? "Doggo" : "Kitty");
    setChoosePet(false);
    setNamingPet(true);
  };

  const createPet = async () => {
    if (!petName.trim()) {
      setAlerts([]); 
      addAlert("Please enter a name for your pet!");
      return;
    }

    try {
      const res = await petApi.adopt({
        petType: selectedPetType,
        petName: petName.trim(),
      });
      setAlerts([]); 
      addAlert(`You have adopted ${petName.trim()}! 🐾`);
      setPet(res.data);
      setNamingPet(false);
      setSelectedPetType(null);
      setPetName("");
    } catch (err) {
      setAlerts([]); 
      const message = err.response?.data?.error || "Failed to adopt pet.";
      addAlert(message);
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
      setAlerts([]); 
      addAlert("Please enter a name for your pet!");
      return false;
    }

    try {
      const res = await petApi.updateName(newName.trim());
      setPet(res.data);
      setAlerts([]); 
      addAlert(`Pet name updated to ${newName.trim()}!`);
      return true;
    } catch (err) {
      setAlerts([]); 
      addAlert("Failed to update pet name.", err);
      return false;
    }
  };

  const handleAction = async (type) => {
    const statMap = {
      feed: "hunger_level",
      play: "happiness_level",
      clean: "cleanliness_level",
    };

    const statKey = statMap[type];
    const currentValue = pet?.[statKey];

    if (currentValue !== undefined && currentValue >= 100) {
      return;
    }

    setActionLoading(type);
    try {
      setAlerts([]); 
      const res = await petApi.doAction({ actionType: type });
      setPet(res.data);
      
      // Show success message based on action type
      const actionMessages = {
        feed: "Fed your pet! 🍖",
        play: "Played with your pet! 🎾",
        clean: "Cleaned your pet! 🧼"
      };
      addAlert(actionMessages[type]);
      
    } catch (err) {
      setAlerts([]); 
      console.error("Action failed:", err);
      const errorMsg = err.response?.data?.error || "Action failed!";
      addAlert(errorMsg);
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
      <div className="p-4 text-center">
        <p className="text-sm text-gray-600">Loading pet...</p>
        <style jsx>{`
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
    );
  }

  if (choosePet) {
    return (
      <>
        {alerts.map(alert => (
          <Alert 
            key={alert.id} 
            message={alert.message} 
            onDismiss={() => removeAlert(alert.id)}
          />
        ))}
        <CompactPetSelection onSelectPet={handlePetSelection} />
        <style jsx>{`
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
      </>
    );
  }

  if (namingPet) {
    return (
      <>
        {alerts.map(alert => (
          <Alert 
            key={alert.id} 
            message={alert.message} 
            onDismiss={() => removeAlert(alert.id)}
          />
        ))}
        <CompactPetNaming
          selectedPetType={selectedPetType}
          petName={petName}
          onNameChange={setPetName}
          onCreate={createPet}
          onBack={() => {
            setNamingPet(false);
            setChoosePet(true);
          }}
        />
        <style jsx>{`
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
      </>
    );
  }

  if (!pet) return (
    <div className="p-4 text-center">
      <p className="text-sm text-gray-600">No pet data found.</p>
    </div>
  );

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

  // Compact Main Pet View
  return (
    <div>
      {alerts.map(alert => (
        <Alert 
          key={alert.id} 
          message={alert.message} 
          onDismiss={() => removeAlert(alert.id)}
        />
      ))}
      
      <CompactPetHeader 
        pet={pet} 
        onUpdateName={updatePetName}
        onShop={() => setActiveView("shop")}
        onInventory={() => setActiveView("inventory")}
      />
      
      <CompactPetImage pet={pet} />

      <CompactPetStats pet={pet} />
      
      <CompactPetActions 
        onAction={handleAction}
        actionLoading={actionLoading}
      />

      <style jsx>{`
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
  );
}

// Compact Components for Dashboard
const CompactPetSelection = ({ onSelectPet }) => (
  <div className="text-center">
    <h3 className="text-lg font-bold mb-2 text-gray-800">Choose Pet 🐾</h3>
    <p className="text-xs text-gray-500 mb-4">This choice is permanent!</p>
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onSelectPet("Dog")}
        className="flex flex-col items-center p-3 rounded-xl border-2 border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all"
      >
        <span className="text-4xl mb-1">🐶</span>
        <span className="text-sm font-semibold text-gray-700">Dog</span>
      </button>
      <button
        onClick={() => onSelectPet("Cat")}
        className="flex flex-col items-center p-3 rounded-xl border-2 border-transparent hover:border-purple-400 hover:bg-purple-50 transition-all"
      >
        <span className="text-4xl mb-1">🐱</span>
        <span className="text-sm font-semibold text-gray-700">Cat</span>
      </button>
    </div>
  </div>
);

const CompactPetNaming = ({ selectedPetType, petName, onNameChange, onCreate, onBack }) => (
  <div className="text-center">
    <div className="text-5xl mb-3">
      {selectedPetType === "Dog" ? "🐶" : "🐱"}
    </div>
    <h3 className="text-lg font-bold mb-2 text-gray-800">Name your {selectedPetType}!</h3>
    
    <input
      type="text"
      value={petName}
      onChange={(e) => onNameChange(e.target.value)}
      placeholder={`Enter name...`}
      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm mb-3"
      maxLength={20}
      autoFocus
    />
    
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={onBack}
        className="py-2 px-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
      >
        ← Back
      </button>
      <button
        onClick={onCreate}
        className="py-2 px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
      >
        Adopt!
      </button>
    </div>
  </div>
);

const CompactPetHeader = ({ pet, onUpdateName, onShop, onInventory }) => {
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
    <div className="flex items-center justify-between mb-3">
      {editingName ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm font-bold flex-1 min-w-0"
            autoFocus
            maxLength={20}
          />
          <button
            onClick={handleSave}
            className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-xs"
          >
            ✓
          </button>
          <button
            onClick={handleCancel}
            className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 text-xs"
          >
            ✗
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">{pet.pet_name}</h3>
            <button
              onClick={() => {
                setTempName(pet.pet_name);
                setEditingName(true);
              }}
              className="text-gray-400 hover:text-blue-500 transition-colors text-xs flex-shrink-0"
            >
              ✏️
            </button>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={onShop}
              className="bg-yellow-500 text-white p-1.5 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
            >
              🛒
            </button>
            <button
              onClick={onInventory}
              className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              🎒
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const CompactPetImage = ({ pet }) => (
  <div className="flex justify-center mb-3">
    <img 
      src={pet.pet_type === "Dog" ? "/dog.gif" : "/cat.gif"} 
      alt={pet.pet_type}
      className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
      loading="lazy"
    />
  </div>
);

const CompactPetStats = ({ pet }) => {
  const getStatColor = (value) => {
    if (value >= 70) return "from-green-400 to-green-600";
    if (value >= 40) return "from-yellow-400 to-yellow-600";
    if (value >= 20) return "from-orange-400 to-orange-600";
    return "from-red-400 to-red-600";
  };

  const expNeeded = Math.floor(100 * Math.pow(1.1, pet.level - 1));
  const expPercent = (pet.experience_points / expNeeded) * 100;

  const stats = [
    { key: "hunger", label: "Hunger", icon: "" },
    { key: "happiness", label: "Happy", icon: "" },
    { key: "cleanliness", label: "Clean", icon: "" },
    { key: "energy", label: "Energy", icon: "" }
  ];

  return (
    <div className="space-y-2 mb-4">
      {stats.map(({ key, label, icon }) => {
        const value = pet[`${key}_level`];
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="flex items-center gap-1">
                <span>{icon}</span>
                <span>{label}</span>
              </span>
              <span className={value < 20 ? "text-red-600 font-bold" : ""}>{value}%</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${getStatColor(value)} transition-all duration-300`}
                style={{ width: `${value}%` }}
              ></div>
            </div>
          </div>
        );
      })}

      {/* Compact EXP Bar */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex justify-between text-xs mb-1">
          <span>Level {pet.level}</span>
          <span className="text-gray-600">{pet.experience_points}/{expNeeded} XP</span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300"
            style={{ width: `${expPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Low Stat Warning */}
      {(pet.hunger_level < 20 || pet.happiness_level < 20 || 
        pet.cleanliness_level < 20 || pet.energy_level < 20) && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-red-600 text-xs font-medium">
            ⚠️ Your companion needs attention!
          </p>
        </div>
      )}
    </div>
  );
};

const CompactPetActions = ({ onAction, actionLoading }) => (
  <div className="grid grid-cols-3 gap-2">
    <button
      onClick={() => onAction("feed")}
      disabled={actionLoading !== null}
      className={`bg-green-500 text-white py-2 rounded-lg transition-all text-xs sm:text-sm font-medium ${
        actionLoading === "feed" 
          ? "opacity-50 cursor-wait" 
          : actionLoading 
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-green-600"
      }`}
    >
      {actionLoading === "feed" ? "..." : "Feed"}
    </button>
    <button
      onClick={() => onAction("play")}
      disabled={actionLoading !== null}
      className={`bg-yellow-500 text-white py-2 rounded-lg transition-all text-xs sm:text-sm font-medium ${
        actionLoading === "play" 
          ? "opacity-50 cursor-wait" 
          : actionLoading 
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-yellow-600"
      }`}
    >
      {actionLoading === "play" ? "..." : "Play"}
    </button>
    <button
      onClick={() => onAction("clean")}
      disabled={actionLoading !== null}
      className={`bg-blue-500 text-white py-2 rounded-lg transition-all text-xs sm:text-sm font-medium ${
        actionLoading === "clean" 
          ? "opacity-50 cursor-wait" 
          : actionLoading 
            ? "opacity-30 cursor-not-allowed"
            : "hover:bg-blue-600"
      }`}
    >
      {actionLoading === "clean" ? "..." : "Clean"}
    </button>
  </div>
);