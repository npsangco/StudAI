import { useState, useEffect } from "react";
import axios from "axios";

export default function PetBuddy({ userId }) {
  const [pet, setPet] = useState(null);
  const [choosePet, setChoosePet] = useState(false);
  const [namingPet, setNamingPet] = useState(false);
  const [selectedPetType, setSelectedPetType] = useState(null);
  const [petName, setPetName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user pet
  const loadPet = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`http://localhost:4000/api/pet/${userId}`);
      if (res.data.choosePet) setChoosePet(true);
      else setPet(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPet();
  }, [userId]);

  // Auto-refresh every 10 seconds to show energy replenishment
  useEffect(() => {
    if (!pet) return;
    const interval = setInterval(() => {
      loadPet();
    }, 10 * 1000); // 10 seconds
    return () => clearInterval(interval);
  }, [pet, userId]);

  // Handle pet type selection
  const handlePetSelection = (type) => {
    setSelectedPetType(type);
    setPetName(type === "Dog" ? "Doggo" : "Kitty"); // Set default name
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
      const res = await axios.post("http://localhost:4000/api/pet", {
        userId,
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
        // Go back to pet selection if naming fails
        setNamingPet(false);
        setChoosePet(true);
      }
    }
  };

  // Update pet name
  const updatePetName = async () => {
    if (!petName.trim()) {
      alert("Please enter a name for your pet!");
      return;
    }

    try {
      const res = await axios.put(`http://localhost:4000/api/pet/${pet.pet_id}/name`, {
        petName: petName.trim(),
      });
      setPet(res.data);
      setEditingName(false);
      alert(`Pet name updated to ${petName.trim()}!`);
    } catch (err) {
      alert("Failed to update pet name.");
    }
  };

  // Pet actions
  const handleAction = async (type) => {
    try {
      const res = await axios.post("http://localhost:4000/api/pet/action", {
        userId,
        actionType: type,
      });
      setPet(res.data);
    } catch (err) {
      alert("Action failed!");
    }
  };

  // Get stat color based on level
  const getStatColor = (value) => {
    if (value >= 70) return "from-green-400 to-green-600";
    if (value >= 40) return "from-yellow-400 to-yellow-600";
    if (value >= 20) return "from-orange-400 to-orange-600";
    return "from-red-400 to-red-600";
  };

  // Exp bar calculation
  const expNeeded = pet ? Math.floor(100 * Math.pow(1.1, pet.level - 1)) : 100;
  const expPercent = pet ? (pet.experience_points / expNeeded) * 100 : 0;

  // Loading or adoption screen
  if (loading) return <p>Loading pet...</p>;

  if (choosePet) {
    return (
      <div className="p-8 bg-white rounded-3xl shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Choose your Pet Companion 🐾</h2>
        <p className="text-sm text-gray-500 mb-6">This choice is permanent! Choose wisely.</p>
        <div className="flex justify-center gap-8">
          <button
            onClick={() => handlePetSelection("Dog")}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-transparent hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group"
          >
            <span className="text-6xl group-hover:scale-110 transition-transform mb-3">🐶</span>
            <span className="font-semibold text-gray-700">Dog</span>
            <p className="text-xs text-gray-500 mt-2 max-w-[120px]">Loyal, energetic, and always hungry!</p>
          </button>
          <button
            onClick={() => handlePetSelection("Cat")}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-transparent hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 group"
          >
            <span className="text-6xl group-hover:scale-110 transition-transform mb-3">🐱</span>
            <span className="font-semibold text-gray-700">Cat</span>
            <p className="text-xs text-gray-500 mt-2 max-w-[120px]">Independent, clean, and loves to play!</p>
          </button>
        </div>
      </div>
    );
  }

  if (namingPet) {
    return (
      <div className="p-8 bg-white rounded-3xl shadow-lg text-center max-w-md mx-auto">
        <div className="text-6xl mb-4">
          {selectedPetType === "Dog" ? "🐶" : "🐱"}
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Name your {selectedPetType}!</h2>
        <p className="text-sm text-gray-500 mb-6">Give your new friend a wonderful name</p>
        
        <div className="mb-6">
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder={`Enter ${selectedPetType} name...`}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            maxLength={20}
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-2 text-right">{petName.length}/20 characters</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setNamingPet(false);
              setChoosePet(true);
              setPetName("");
            }}
            className="flex-1 py-3 px-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={createPet}
            className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold"
          >
            Adopt! 🐾
          </button>
        </div>
      </div>
    );
  }

  if (!pet) return <p>No pet data found.</p>;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-lg text-center">
      {/* Pet Header with Editable Name */}
      <div className="flex items-center justify-center gap-3 mb-2">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-xl font-bold text-center"
              autoFocus
              maxLength={20}
            />
            <button
              onClick={updatePetName}
              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setPetName(pet.pet_name);
              }}
              className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 text-sm"
            >
              ✗
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-xl">{pet.pet_name}</h2>
            <button
              onClick={() => {
                setPetName(pet.pet_name);
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
      
      <div className="text-6xl">{pet.pet_type === "Dog" ? "🐶" : "🐱"}</div>
      <p className="text-sm text-gray-500">Level {pet.level}</p>

      {/* Pet Stats */}
      <div className="mt-4 space-y-3">
        {["hunger", "happiness", "cleanliness", "energy"].map((stat) => {
          const value = pet[`${stat}_level`];
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
          <p className="text-sm">EXP: {pet.experience_points}/{expNeeded}</p>
          <div className="w-full bg-gray-200 h-3 rounded-full">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600"
              style={{ width: `${expPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Low Stat Warning */}
      {(pet.hunger_level < 20 || pet.happiness_level < 20 || 
        pet.cleanliness_level < 20 || pet.energy_level < 20) && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm font-medium">
            ⚠️ Your pet needs attention!
          </p>
        </div>
      )}

      {/* Pet Actions */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        <button
          onClick={() => handleAction("feed")}
          className="bg-green-500 text-white py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          🍖 Feed
        </button>
        <button
          onClick={() => handleAction("play")}
          className="bg-yellow-500 text-white py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          🎾 Play
        </button>
        <button
          onClick={() => handleAction("clean")}
          className="bg-blue-500 text-white py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          🛁 Clean
        </button>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadPet}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
      >
        🔄 Refresh Stats
      </button>
    </div>
  );
}