import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Flame, 
  Apple, 
  Beef, 
  Wheat, 
  Droplets,
  TrendingUp,
  Sparkles,
  ChevronRight,
  X,
  Search,
  Clock,
  Star,
  Utensils
} from 'lucide-react';

// Sample food database with nutrition info
const FOOD_DATABASE = [
  { id: 1, name: 'Grilled Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, category: 'protein', emoji: '🍗', healthy: true },
  { id: 2, name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 1.8, category: 'carbs', emoji: '🍚', healthy: true },
  { id: 3, name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, category: 'vegetable', emoji: '🥦', healthy: true },
  { id: 4, name: 'Salmon Fillet', calories: 208, protein: 20, carbs: 0, fat: 13, category: 'protein', emoji: '🐟', healthy: true },
  { id: 5, name: 'Sweet Potato', calories: 103, protein: 2.3, carbs: 24, fat: 0.1, category: 'carbs', emoji: '🍠', healthy: true },
  { id: 6, name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 0.7, category: 'dairy', emoji: '🥛', healthy: true },
  { id: 7, name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, category: 'fat', emoji: '🥑', healthy: true },
  { id: 8, name: 'Eggs (2)', calories: 156, protein: 13, carbs: 1.1, fat: 11, category: 'protein', emoji: '🥚', healthy: true },
  { id: 9, name: 'Spinach Salad', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, category: 'vegetable', emoji: '🥗', healthy: true },
  { id: 10, name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, category: 'fruit', emoji: '🍌', healthy: true },
  { id: 11, name: 'Pizza Slice', calories: 285, protein: 12, carbs: 36, fat: 10, category: 'junk', emoji: '🍕', healthy: false },
  { id: 12, name: 'Burger', calories: 540, protein: 25, carbs: 40, fat: 29, category: 'junk', emoji: '🍔', healthy: false },
  { id: 13, name: 'French Fries', calories: 365, protein: 4, carbs: 48, fat: 17, category: 'junk', emoji: '🍟', healthy: false },
  { id: 14, name: 'Ice Cream', calories: 207, protein: 3.5, carbs: 24, fat: 11, category: 'dessert', emoji: '🍦', healthy: false },
  { id: 15, name: 'Soda', calories: 140, protein: 0, carbs: 39, fat: 0, category: 'drink', emoji: '🥤', healthy: false },
  { id: 16, name: 'Oatmeal', calories: 158, protein: 6, carbs: 27, fat: 3.2, category: 'carbs', emoji: '🥣', healthy: true },
  { id: 17, name: 'Almonds (1oz)', calories: 164, protein: 6, carbs: 6, fat: 14, category: 'snack', emoji: '🥜', healthy: true },
  { id: 18, name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, category: 'fruit', emoji: '🍎', healthy: true },
  { id: 19, name: 'Green Tea', calories: 2, protein: 0, carbs: 0, fat: 0, category: 'drink', emoji: '🍵', healthy: true },
  { id: 20, name: 'Quinoa', calories: 222, protein: 8, carbs: 39, fat: 3.6, category: 'carbs', emoji: '🌾', healthy: true },
];

// Megumin's food suggestions based on time and goals
const MEAL_SUGGESTIONS = {
  breakfast: [
    { foods: ['Oatmeal', 'Banana', 'Green Tea'], message: "Start your day with energy! Oatmeal keeps you full~" },
    { foods: ['Eggs (2)', 'Avocado', 'Green Tea'], message: "Protein power breakfast! You'll feel amazing!" },
    { foods: ['Greek Yogurt', 'Apple', 'Almonds (1oz)'], message: "Light but nutritious! Perfect for busy mornings~" },
  ],
  lunch: [
    { foods: ['Grilled Chicken Breast', 'Brown Rice', 'Broccoli'], message: "Balanced lunch! Your muscles will thank you~" },
    { foods: ['Salmon Fillet', 'Quinoa', 'Spinach Salad'], message: "Omega-3 boost! Great for your brain, sugoi!" },
    { foods: ['Sweet Potato', 'Eggs (2)', 'Avocado'], message: "Comfort food but healthy! Win-win~" },
  ],
  dinner: [
    { foods: ['Salmon Fillet', 'Sweet Potato', 'Broccoli'], message: "Light dinner for better sleep! Ganbatte~" },
    { foods: ['Grilled Chicken Breast', 'Spinach Salad', 'Avocado'], message: "Low carb evening! You're doing great!" },
    { foods: ['Greek Yogurt', 'Almonds (1oz)'], message: "Keep it simple tonight~ Your body will rest well!" },
  ],
  snack: [
    { foods: ['Apple', 'Almonds (1oz)'], message: "Healthy snack time! Much better than chips~" },
    { foods: ['Banana', 'Greek Yogurt'], message: "Quick energy boost! Kawaii snacking~" },
    { foods: ['Green Tea'], message: "Stay hydrated! Tea time with Megumin~" },
  ],
};

const FoodPanel = ({ onFoodLog, onAskYuki, dailyGoal = 2000 }) => {
  const [todaysFoods, setTodaysFoods] = useState([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentMealType, setCurrentMealType] = useState('lunch');

  // Calculate current meal type based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setCurrentMealType('breakfast');
    else if (hour >= 11 && hour < 15) setCurrentMealType('lunch');
    else if (hour >= 15 && hour < 18) setCurrentMealType('snack');
    else setCurrentMealType('dinner');
  }, []);

  // Calculate daily totals
  const dailyTotals = todaysFoods.reduce((acc, food) => ({
    calories: acc.calories + food.calories,
    protein: acc.protein + food.protein,
    carbs: acc.carbs + food.carbs,
    fat: acc.fat + food.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const calorieProgress = Math.min((dailyTotals.calories / dailyGoal) * 100, 100);
  const healthyCount = todaysFoods.filter(f => f.healthy).length;
  const unhealthyCount = todaysFoods.filter(f => !f.healthy).length;

  // Filter foods
  const filteredFoods = FOOD_DATABASE.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || food.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Add food to today's log
  const addFood = (food) => {
    const newEntry = {
      ...food,
      logId: Date.now(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setTodaysFoods(prev => [...prev, newEntry]);
    setShowAddFood(false);
    
    // Notify parent for Megumin's reaction
    onFoodLog?.(newEntry);
  };

  // Remove food from log
  const removeFood = (logId) => {
    setTodaysFoods(prev => prev.filter(f => f.logId !== logId));
  };

  // Get current suggestion
  const getCurrentSuggestion = () => {
    const suggestions = MEAL_SUGGESTIONS[currentMealType];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  const [currentSuggestion] = useState(getCurrentSuggestion());

  // Ask Megumin about a food
  const askYukiAboutFood = (food) => {
    const question = food.healthy 
      ? `Tell me about the benefits of eating ${food.name}!`
      : `Is ${food.name} okay to eat sometimes?`;
    onAskYuki?.(question);
  };

  // Quick add suggestion
  const addSuggestion = () => {
    currentSuggestion.foods.forEach(foodName => {
      const food = FOOD_DATABASE.find(f => f.name === foodName);
      if (food) addFood(food);
    });
  };

  const categories = [
    { id: 'all', label: 'All', icon: Utensils },
    { id: 'protein', label: 'Protein', icon: Beef },
    { id: 'carbs', label: 'Carbs', icon: Wheat },
    { id: 'vegetable', label: 'Veggies', icon: Apple },
    { id: 'fruit', label: 'Fruit', icon: Apple },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-950/40 to-teal-950/40 backdrop-blur-md rounded-2xl border border-emerald-500/20 overflow-hidden">
      {/* Header with Daily Progress */}
      <div className="px-4 py-3 bg-emerald-950/50 border-b border-emerald-500/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-emerald-200 font-semibold flex items-center gap-2">
            <span className="text-xl">🥗</span>
            Today's Nutrition
          </h2>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-emerald-400">{healthyCount}</span>
            <span className="text-emerald-300">✓</span>
            {unhealthyCount > 0 && (
              <>
                <span className="text-amber-400 ml-2">{unhealthyCount}</span>
                <span className="text-amber-300">⚠</span>
              </>
            )}
          </div>
        </div>

        {/* Calorie Progress Bar */}
        <div className="relative">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-emerald-300 flex items-center gap-1">
              <Flame size={12} /> {dailyTotals.calories} kcal
            </span>
            <span className="text-emerald-400/70">{dailyGoal} goal</span>
          </div>
          <div className="h-3 bg-emerald-900/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${calorieProgress}%` }}
              className={`h-full rounded-full ${
                calorieProgress > 100 ? 'bg-red-500' :
                calorieProgress > 80 ? 'bg-amber-500' :
                'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
            />
          </div>
        </div>

        {/* Macro Summary */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 text-center p-2 bg-emerald-900/30 rounded-lg">
            <div className="text-xs text-emerald-400/70 flex items-center justify-center gap-1">
              <Beef size={10} /> Protein
            </div>
            <div className="text-sm font-semibold text-emerald-200">{dailyTotals.protein}g</div>
          </div>
          <div className="flex-1 text-center p-2 bg-emerald-900/30 rounded-lg">
            <div className="text-xs text-emerald-400/70 flex items-center justify-center gap-1">
              <Wheat size={10} /> Carbs
            </div>
            <div className="text-sm font-semibold text-emerald-200">{dailyTotals.carbs}g</div>
          </div>
          <div className="flex-1 text-center p-2 bg-emerald-900/30 rounded-lg">
            <div className="text-xs text-emerald-400/70 flex items-center justify-center gap-1">
              <Droplets size={10} /> Fat
            </div>
            <div className="text-sm font-semibold text-emerald-200">{dailyTotals.fat}g</div>
          </div>
        </div>
      </div>

      {/* Megumin's Suggestion */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-3 mt-3 p-3 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-xl border border-rose-500/30"
      >
        <div className="flex items-start gap-2">
          <span className="text-2xl">🎀</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-rose-300">Megumin suggests for {currentMealType}:</span>
              <Sparkles size={12} className="text-yellow-400" />
            </div>
            <p className="text-xs text-rose-200/80 mb-2">{currentSuggestion.message}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {currentSuggestion.foods.map((foodName, i) => {
                const food = FOOD_DATABASE.find(f => f.name === foodName);
                return (
                  <span key={i} className="px-2 py-0.5 bg-rose-500/30 rounded-full text-xs text-rose-200">
                    {food?.emoji} {foodName}
                  </span>
                );
              })}
            </div>
            <button
              onClick={addSuggestion}
              className="text-xs px-3 py-1 bg-rose-500/40 hover:bg-rose-500/60 text-rose-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus size={12} /> Add all
            </button>
          </div>
        </div>
      </motion.div>

      {/* Today's Food Log */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-300 flex items-center gap-1">
            <Clock size={14} /> Food Log
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddFood(true)}
            className="p-1.5 bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-200 rounded-lg transition-colors"
          >
            <Plus size={16} />
          </motion.button>
        </div>

        {todaysFoods.length === 0 ? (
          <div className="text-center py-8 text-emerald-400/60">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="text-sm">No food logged yet</p>
            <p className="text-xs mt-1">Tap + to add your meals!</p>
          </div>
        ) : (
          <AnimatePresence>
            {todaysFoods.map((food) => (
              <motion.div
                key={food.logId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-center gap-3 p-2 rounded-xl ${
                  food.healthy 
                    ? 'bg-emerald-900/30 border border-emerald-500/20' 
                    : 'bg-amber-900/30 border border-amber-500/20'
                }`}
              >
                <span className="text-2xl">{food.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-emerald-100 truncate">{food.name}</span>
                    {food.healthy ? (
                      <Star size={12} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <span className="text-xs text-amber-400">⚠</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400/70">
                    <span>{food.calories} kcal</span>
                    <span>•</span>
                    <span>{food.time}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => askYukiAboutFood(food)}
                    className="p-1.5 hover:bg-emerald-500/30 rounded-lg transition-colors"
                    title="Ask Megumin"
                  >
                    <span className="text-sm">💬</span>
                  </button>
                  <button
                    onClick={() => removeFood(food.logId)}
                    className="p-1.5 hover:bg-red-500/30 rounded-lg transition-colors text-red-400/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="px-3 py-2 bg-emerald-950/50 border-t border-emerald-500/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400/70">
            {todaysFoods.length} items logged
          </span>
          <div className="flex items-center gap-1 text-emerald-300">
            <TrendingUp size={12} />
            <span>{Math.round((healthyCount / Math.max(todaysFoods.length, 1)) * 100)}% healthy</span>
          </div>
        </div>
      </div>

      {/* Add Food Modal */}
      <AnimatePresence>
        {showAddFood && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAddFood(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-gradient-to-b from-emerald-950 to-teal-950 rounded-2xl border border-emerald-500/30 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-emerald-200">Add Food</h3>
                  <button
                    onClick={() => setShowAddFood(false)}
                    className="p-1 hover:bg-emerald-500/30 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-emerald-400" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search foods..."
                    className="w-full pl-9 pr-4 py-2 bg-emerald-900/30 border border-emerald-500/30 rounded-xl text-emerald-100 placeholder-emerald-400/50 focus:outline-none focus:border-emerald-400/50"
                  />
                </div>

                {/* Categories */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-emerald-500/40 text-emerald-100'
                          : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      <cat.icon size={12} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food List */}
              <div className="max-h-64 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                {filteredFoods.map((food) => (
                  <motion.button
                    key={food.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addFood(food)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      food.healthy
                        ? 'bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/20'
                        : 'bg-amber-900/20 hover:bg-amber-900/40 border border-amber-500/20'
                    }`}
                  >
                    <span className="text-2xl">{food.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-emerald-100">{food.name}</span>
                        {!food.healthy && <span className="text-xs text-amber-400">⚠</span>}
                      </div>
                      <div className="text-xs text-emerald-400/70">
                        {food.calories} kcal • P:{food.protein}g • C:{food.carbs}g • F:{food.fat}g
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-emerald-400/50" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FoodPanel;

