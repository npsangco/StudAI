import { useState, useEffect, useCallback, useMemo } from "react";
import { petApi } from "../api/api";
import PetShop from "./PetShop";
import PetInventory from "./PetInventory";
import ToastContainer from "./ToastContainer";
import { useToast } from "../hooks/useToast";
import { Edit2, ShoppingCart, Backpack } from "lucide-react";

export default function PetBuddy() {
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("pet");
  const [actionLoading, setActionLoading] = useState(null);
  
  const [choosePet, setChoosePet] = useState(false);
  const [namingPet, setNamingPet] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState(null);
  const [petName, setPetName] = useState("");
  
  const { toasts, removeToast, toast } = useToast();

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

  // Refreshes pet stats every 30 seconds
  useEffect(() => {
    if (!pet) return;

    const timeout = setTimeout(() => {
      refreshPetStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearTimeout(timeout);
  }, [pet?.pet_id, refreshPetStats]);

  // Refreshes when user completes quizzes or activities
  useEffect(() => {
    const handleActivityEvent = () => {
      refreshPetStats();
    };

    window.addEventListener('questActivity', handleActivityEvent);

    return () => {
      window.removeEventListener('questActivity', handleActivityEvent);
    };
  }, []);

  const refreshPetStats = useCallback(async () => {
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
  }, []);

  const handlePetSelection = (type) => {
    setSelectedPetType(type);
    setPetName(type === "Dog" ? "Doggo" : "Kitty");
    setChoosePet(false);
    setNamingPet(true);
  };

  const createPet = async () => {
    if (!petName.trim()) {
      toast.warning("Please enter a name for your pet!");
      return;
    }

    try {
      const res = await petApi.adopt({
        petType: selectedPetType,
        petName: petName.trim(),
      });
      toast.success(`You have adopted ${petName.trim()}! 🐾`);
      setPet(res.data);
      setNamingPet(false);
      setSelectedPetType(null);
      setPetName("");
    } catch (err) {
      const message = err.response?.data?.error || "Failed to adopt pet.";
      toast.error(message);
      if (message.includes("already")) {
        setNamingPet(false);
        setChoosePet(false);
      } else {
        setNamingPet(false);
        setChoosePet(true);
      }
    }
  };

  const updatePetName = async (newName) => {
    if (!newName.trim()) {
      toast.warning("Please enter a name for your pet!");
      return false;
    }

    try {
      const res = await petApi.updateName(newName.trim());
      setPet(res.data);
      toast.success(`Pet name updated to ${newName.trim()}!`);
      return true;
    } catch (err) {
      toast.error("Failed to update pet name.");
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
      const res = await petApi.doAction({ actionType: type });
      setPet(() => res.data);
      
      const actionMessages = {
        feed: "Fed your pet!",
        play: "Played with your pet!",
        clean: "Cleaned your pet!"
      };
      toast.success(actionMessages[type]);
      
    } catch (err) {
      console.error("Action failed:", err);
      const errorMsg = err.response?.data?.error || "Action failed!";
      toast.error(errorMsg);
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
      </div>
    );
  }

  if (choosePet) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <CompactPetSelection onSelectPet={handlePetSelection} />
      </>
    );
  }

  if (namingPet) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
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
      </>
    );
  }

  if (!pet) return (
    <div className="p-4 text-center">
      <p className="text-sm text-gray-600">No pet data found.</p>
    </div>
  );

  const showShop = activeView === "shop";
  const showInventory = activeView === "inventory";

  // Changes background color based on pet health
  const criticalStats = [pet.hunger_level, pet.happiness_level, pet.cleanliness_level].filter(stat => stat < 20);
  const lowStats = [pet.hunger_level, pet.happiness_level, pet.cleanliness_level].filter(stat => stat < 40);
  
  let containerClass = "";
  if (criticalStats.length >= 2) {
    containerClass = "bg-red-50 border-2 border-red-400 shadow-red-200 shadow-lg";
  } else if (criticalStats.length === 1 || lowStats.length >= 1) {
    containerClass = "bg-yellow-50 border-2 border-yellow-400 shadow-yellow-200 shadow-lg";
  } else {
    containerClass = "bg-white";
  }

  return (
    <>
      <div className={`rounded-lg p-4 transition-all duration-300 ${containerClass}`}>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        
        <CompactPetHeader 
          pet={pet} 
          onUpdateName={updatePetName}
          onShop={() => setActiveView("shop")}
          onInventory={() => setActiveView("inventory")}
        />
        
        <div className="min-h-[60px] flex items-end justify-center mb-2">
          <PetBubbleDialog pet={pet} />
        </div>
        
        <CompactPetImage pet={pet} />

        <CompactPetStats pet={pet} />
        
        <CompactPetActions 
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      </div>

      {showShop && <PetShop onClose={() => setActiveView("pet")} />}
      {showInventory && (
        <PetInventory 
          onClose={() => setActiveView("pet")}
          onUseItem={handleItemUse}
        />
      )}
    </>
  );
}

const CompactPetSelection = ({ onSelectPet }) => (
    <div className="p-4 text-center">
      <p className="text-sm text-gray-600">No pet data found.</p>
    </div>
  );

  // Show shop/inventory as overlay instead of replacing the pet view
  const showShop = activeView === "shop";
  const showInventory = activeView === "inventory";

  // Compact Main Pet View
  // Determine container style based on pet stats
  const criticalStats = [pet.hunger_level, pet.happiness_level, pet.cleanliness_level].filter(stat => stat < 20);
  const lowStats = [pet.hunger_level, pet.happiness_level, pet.cleanliness_level].filter(stat => stat < 40);
  
  let containerClass = "";
  if (criticalStats.length >= 2) {
    // Multiple critical stats - red alert
    containerClass = "bg-red-50 border-2 border-red-400 shadow-red-200 shadow-lg";
  } else if (criticalStats.length === 1 || lowStats.length >= 1) {
    // One critical or any low stat - yellow warning
    containerClass = "bg-yellow-50 border-2 border-yellow-400 shadow-yellow-200 shadow-lg";
  } else {
    // All good
    containerClass = "bg-white";
  }

  return (
    <>
      <div className={`rounded-lg p-4 transition-all duration-300 ${containerClass}`}>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        
        <CompactPetHeader 
          pet={pet} 
          onUpdateName={updatePetName}
          onShop={() => setActiveView("shop")}
          onInventory={() => setActiveView("inventory")}
        />
        
        {/* Fixed height container to prevent layout shift */}
        <div className="min-h-[60px] flex items-end justify-center mb-2">
          <PetBubbleDialog pet={pet} />
        </div>
        
        <CompactPetImage pet={pet} />

        <CompactPetStats pet={pet} />
        
        <CompactPetActions 
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      </div>

      {/* Render shop and inventory as overlays */}
      {showShop && <PetShop onClose={() => setActiveView("pet")} />}
      {showInventory && (
        <PetInventory 
          onClose={() => setActiveView("pet")}
          onUseItem={handleItemUse}
        />
      )}
    </>
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
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={onShop}
              className="bg-yellow-500 text-white p-1.5 rounded-lg hover:bg-yellow-600 transition-colors text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
            <button
              onClick={onInventory}
              className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <Backpack className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const getCatSprite = (level) => {
  if (level >= 1 && level <= 16) {
    return "/cat-kitten.gif";
  } else if (level >= 17 && level <= 33) {
    return "/cat-teen.gif";
  } else {
    return "/cat-adult.gif";
  }
};

const getDogSprite = (level) => {
  if (level >= 1 && level <= 16) {
    return "/dog-puppy.gif";
  } else {
    return "/dog.gif";
  }
};

const PetBubbleDialog = ({ pet }) => {
  const [currentDialog, setCurrentDialog] = useState(null);
  const [dialogKey, setDialogKey] = useState(0);

  const dialogMessages = useMemo(() => ({
    critical_hunger: [
      "I'm so hungry! Feed me please!",
      "My tummy is rumbling...",
      "I really need some food!",
      "*stomach growls* I'm starving!",
    ],
    critical_happiness: [
      "I'm feeling so lonely...",
      "Can we play? I'm really sad...",
      "I need some fun time!",
      "*whimpers* Please play with me...",
    ],
    critical_cleanliness: [
      "I really need a bath!",
      "I'm so dirty... can you clean me?",
      "Please help me get clean!",
      "*covered in dirt* I need cleaning!",
    ],
    low_hunger: [
      "I could use a snack!",
      "Getting a bit hungry here...",
      "Food would be nice!",
    ],
    low_happiness: [
      "Want to play soon?",
      "I'm getting a bit bored...",
      "Some playtime would be fun!",
    ],
    low_cleanliness: [
      "Could use a little cleanup!",
      "I'm getting a bit messy...",
      "A bath would be nice soon!",
    ],
    motivated: [
      "You're doing amazing! Keep it up!",
      "I'm so proud of you!",
      "Great job studying today!",
      "You're crushing it!",
      "Keep up the awesome work!",
      "I believe in you!",
      "You're making great progress!",
      "Learning looks good on you!",
      "You're unstoppable!",
      "Focus and conquer!",
    ],
    level_milestone: [
      `Wow! We're level ${pet.level}!`,
      "We're growing stronger together!",
      "Look how far we've come!",
      "This is exciting progress!",
    ],
    happy: [
      "I'm feeling great!",
      "Life is good!",
      "Thanks for taking care of me!",
      "You're the best!",
      "I love spending time with you!",
    ],
  }), [pet.level]);

  useEffect(() => {
    const getDialogMessage = () => {
      const { hunger_level, happiness_level, cleanliness_level } = pet;
      
      if (hunger_level < 20) {
        const messages = dialogMessages.critical_hunger;
        return messages[Math.floor(Math.random() * messages.length)];
      }
      if (happiness_level < 20) {
        const messages = dialogMessages.critical_happiness;
        return messages[Math.floor(Math.random() * messages.length)];
      }
      if (cleanliness_level < 20) {
        const messages = dialogMessages.critical_cleanliness;
        return messages[Math.floor(Math.random() * messages.length)];
      }
      
      if (hunger_level < 40) {
        const messages = dialogMessages.low_hunger;
        return messages[Math.floor(Math.random() * messages.length)];
      }
      if (happiness_level < 40) {
        const messages = dialogMessages.low_happiness;
        return messages[Math.floor(Math.random() * messages.length)];
      }
      if (cleanliness_level < 40) {
        const messages = dialogMessages.low_cleanliness;
        return messages[Math.floor(Math.random() * messages.length)];
      }
      
      if (pet.level % 5 === 0 && pet.level > 1 && Math.random() < 0.3) {
        const messages = dialogMessages.level_milestone;
        return messages[Math.floor(Math.random() * messages.length)];
      }
      
      if (hunger_level >= 70 && happiness_level >= 70 && cleanliness_level >= 70) {
        if (Math.random() < 0.4) {
          const messages = dialogMessages.motivated;
          return messages[Math.floor(Math.random() * messages.length)];
        }
      }
      
      if (hunger_level >= 50 && happiness_level >= 50 && cleanliness_level >= 50) {
        if (Math.random() < 0.3) {
          const messages = dialogMessages.happy;
          return messages[Math.floor(Math.random() * messages.length)];
        }
      }
      
      return null;
    };

    const message = getDialogMessage();
    setCurrentDialog(message);
    setDialogKey(prev => prev + 1);

    const interval = setInterval(() => {
      const newMessage = getDialogMessage();
      setCurrentDialog(newMessage);
      setDialogKey(prev => prev + 1);
    }, 8000);

    return () => clearInterval(interval);
  }, [pet, dialogMessages]);

  if (!currentDialog) return null;

  return (
    <div key={dialogKey} className="flex justify-center animate-bounce-in">
      <div className="relative max-w-xs">
        <div className="bg-white border-2 border-gray-300 rounded-2xl px-4 py-2 shadow-lg relative">
          <p className="text-xs sm:text-sm text-gray-800 font-medium text-center">
            {currentDialog}
          </p>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-300"></div>
          <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-7 border-r-7 border-t-7 border-l-transparent border-r-transparent border-t-white"></div>
        </div>
      </div>
    </div>
  );
};

const CompactPetImage = ({ pet }) => {
  const petImage = pet.pet_type === "Dog" 
    ? getDogSprite(pet.level)
    : getCatSprite(pet.level);
  
  return (
    <div className="flex justify-center mb-3">
      <img 
        src={petImage} 
        alt={`${pet.pet_type} - Level ${pet.level}`}
        className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
        loading="lazy"
      />
    </div>
  );
};

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
    </div>
  );
};

const CompactPetActions = ({ onAction, actionLoading }) => (
  <div className="grid grid-cols-3 gap-2">
    <button
      onClick={() => onAction("feed")}
      disabled={actionLoading !== null}
      className={`bg-green-500 text-white py-2 rounded-lg transition-all text-xs sm:text-sm font-medium cursor-pointer ${
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
      className={`bg-yellow-500 text-white py-2 rounded-lg transition-all text-xs sm:text-sm font-medium cursor-pointer ${
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
      className={`bg-blue-500 text-white py-2 rounded-lg transition-all text-xs sm:text-sm font-medium cursor-pointer ${
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