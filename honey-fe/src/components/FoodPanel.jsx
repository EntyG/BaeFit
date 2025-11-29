import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  Utensils,
  ListPlus,
  RefreshCw
} from 'lucide-react';

// Helper to format numbers with 1 decimal place precision
const formatNum = (num) => {
  if (num === 0) return '0';
  if (Number.isInteger(num)) return num.toString();
  return Number(num.toFixed(1)).toString();
};

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

const FoodPanel = forwardRef(({ onFoodLog, onAskYuki, dailyGoal = 2000 }, ref) => {
  const [todaysFoods, setTodaysFoods] = useState([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentMealType, setCurrentMealType] = useState('lunch');
  const [recentlyAdded, setRecentlyAdded] = useState([]);

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
  const addFood = (food, silent = false) => {
    // Use a composite unique id to avoid React key collisions when adding
    // multiple items in the same millisecond (e.g. "Add all", meal plan, etc.)
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newEntry = {
      ...food,
      logId: uniqueId,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setTodaysFoods(prev => [...prev, newEntry]);
    setShowAddFood(false);
    
    // Visual feedback - highlight recently added
    setRecentlyAdded(prev => [...prev, newEntry.logId]);
    setTimeout(() => {
      setRecentlyAdded(prev => prev.filter(id => id !== newEntry.logId));
    }, 3000);
    
    // Notify parent for Megumin's reaction (unless silent - from chat suggestion)
    if (!silent) {
      onFoodLog?.(newEntry);
    }
    
    return newEntry;
  };

  // Add food by name (called from parent when Megumin suggests food)
  const addFoodByName = (foodName) => {
    // Try exact match first
    let food = FOOD_DATABASE.find(f => 
      f.name.toLowerCase() === foodName.toLowerCase()
    );
    
    // Try partial match if no exact match
    if (!food) {
      food = FOOD_DATABASE.find(f => 
        f.name.toLowerCase().includes(foodName.toLowerCase()) ||
        foodName.toLowerCase().includes(f.name.toLowerCase())
      );
    }
    
    if (food) {
      const entry = addFood(food, true); // Silent add
      return { success: true, food: entry };
    }
    return { success: false, foodName };
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addFoodByName,
    addFoods: (foodNames) => {
      const results = foodNames.map(name => addFoodByName(name));
      return results;
    },
    getFoodDatabase: () => FOOD_DATABASE,
  }));

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

  // Generate healthy meal plan for the day
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState(null);

  const generateMealPlan = () => {
    const healthyFoods = FOOD_DATABASE.filter(f => f.healthy);
    
    const getRandomFoods = (count, exclude = []) => {
      const available = healthyFoods.filter(f => !exclude.includes(f.id));
      const selected = [];
      for (let i = 0; i < count && available.length > 0; i++) {
        const idx = Math.floor(Math.random() * available.length);
        selected.push(available.splice(idx, 1)[0]);
      }
      return selected;
    };

    const breakfast = getRandomFoods(3);
    const lunch = getRandomFoods(3, breakfast.map(f => f.id));
    const dinner = getRandomFoods(3, [...breakfast, ...lunch].map(f => f.id));
    const snacks = getRandomFoods(2, [...breakfast, ...lunch, ...dinner].map(f => f.id));

    const plan = { breakfast, lunch, dinner, snacks };
    
    // Calculate totals
    const allFoods = [...breakfast, ...lunch, ...dinner, ...snacks];
    const totals = allFoods.reduce((acc, food) => ({
      calories: acc.calories + food.calories,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fat: acc.fat + food.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    setMealPlan({ ...plan, totals });
    setShowMealPlan(true);
  };

  // Add entire meal plan to today's foods
  const addMealPlan = () => {
    if (!mealPlan) return;
    const allFoods = [...mealPlan.breakfast, ...mealPlan.lunch, ...mealPlan.dinner, ...mealPlan.snacks];
    allFoods.forEach(food => addFood(food));
    setShowMealPlan(false);
    onAskYuki?.("I just added a healthy meal plan for today! What do you think?");
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
      <div className="px-6 py-5 bg-emerald-950/50 border-b border-emerald-500/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-emerald-200 font-semibold flex items-center gap-2 text-base">
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
        <div className="relative mt-1 space-y-2">
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
        <div className="flex gap-3 mt-4">
          <div className="flex-1 text-center py-3 px-3 bg-emerald-900/30 rounded-lg">
            <div className="text-xs text-emerald-400/70 flex items-center justify-center gap-1 mb-1">
              <Beef size={11} /> Protein
            </div>
            <div className="text-sm font-bold text-emerald-200">{formatNum(dailyTotals.protein)}g</div>
          </div>
          <div className="flex-1 text-center py-3 px-3 bg-emerald-900/30 rounded-lg">
            <div className="text-xs text-emerald-400/70 flex items-center justify-center gap-1 mb-1">
              <Wheat size={11} /> Carbs
            </div>
            <div className="text-sm font-bold text-emerald-200">{formatNum(dailyTotals.carbs)}g</div>
          </div>
          <div className="flex-1 text-center py-3 px-3 bg-emerald-900/30 rounded-lg">
            <div className="text-xs text-emerald-400/70 flex items-center justify-center gap-1 mb-1">
              <Droplets size={11} /> Fat
            </div>
            <div className="text-sm font-bold text-emerald-200">{formatNum(dailyTotals.fat)}g</div>
          </div>
        </div>
      </div>

      {/* Megumin's Suggestion */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 p-3.5 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-xl border border-rose-500/30"
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

      {/* Generate Meal Plan Button */}
      <div className="mx-4 mt-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateMealPlan}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600/50 to-teal-600/50 hover:from-emerald-600/70 hover:to-teal-600/70 text-emerald-100 rounded-xl transition-all flex items-center justify-center gap-2 border border-emerald-500/30"
        >
          <ListPlus size={18} />
          <span className="font-medium text-sm">Generate Healthy Meal Plan</span>
          <Sparkles size={14} className="text-yellow-400" />
        </motion.button>
      </div>

      {/* Today's Food Log */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-emerald-300 flex items-center gap-1.5">
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
          <div className="text-center py-10 text-emerald-400/60">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm font-medium">No food logged yet</p>
            <p className="text-xs mt-1.5 text-emerald-500/50">Tap + to add your meals!</p>
          </div>
        ) : (
          <AnimatePresence>
            {todaysFoods.map((food) => (
              <motion.div
                key={food.logId}
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  boxShadow: recentlyAdded.includes(food.logId) 
                    ? '0 0 20px rgba(52, 211, 153, 0.5)' 
                    : 'none'
                }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`relative flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  recentlyAdded.includes(food.logId)
                    ? 'bg-emerald-700/50 border-2 border-emerald-400/60 ring-2 ring-emerald-400/30'
                    : food.healthy 
                      ? 'bg-emerald-900/30 border border-emerald-500/20' 
                      : 'bg-amber-900/30 border border-amber-500/20'
                }`}
              >
                <span className="text-2xl">{food.emoji}</span>
                {recentlyAdded.includes(food.logId) && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    ✨ Added!
                  </span>
                )}
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
      <div className="px-5 py-3 bg-emerald-950/50 border-t border-emerald-500/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400/70 font-medium">
            {todaysFoods.length} items logged
          </span>
          <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
            <TrendingUp size={13} />
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
                        {formatNum(food.calories)} kcal • P:{formatNum(food.protein)}g • C:{formatNum(food.carbs)}g • F:{formatNum(food.fat)}g
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

      {/* Meal Plan Modal */}
      <AnimatePresence>
        {showMealPlan && mealPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMealPlan(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-gradient-to-b from-emerald-950 to-teal-950 rounded-2xl border border-emerald-500/30 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-emerald-500/20 bg-emerald-900/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-emerald-200 flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" />
                    Healthy Meal Plan
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateMealPlan}
                      className="p-1.5 hover:bg-emerald-500/30 rounded-lg transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw size={16} className="text-emerald-400" />
                    </button>
                    <button
                      onClick={() => setShowMealPlan(false)}
                      className="p-1.5 hover:bg-emerald-500/30 rounded-lg transition-colors"
                    >
                      <X size={18} className="text-emerald-400" />
                    </button>
                  </div>
                </div>
                {/* Totals Summary */}
                <div className="mt-3 p-2 bg-emerald-900/40 rounded-lg">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <div className="text-emerald-400/70">Calories</div>
                      <div className="font-semibold text-emerald-200">{formatNum(mealPlan.totals.calories)}</div>
                    </div>
                    <div>
                      <div className="text-emerald-400/70">Protein</div>
                      <div className="font-semibold text-emerald-200">{formatNum(mealPlan.totals.protein)}g</div>
                    </div>
                    <div>
                      <div className="text-emerald-400/70">Carbs</div>
                      <div className="font-semibold text-emerald-200">{formatNum(mealPlan.totals.carbs)}g</div>
                    </div>
                    <div>
                      <div className="text-emerald-400/70">Fat</div>
                      <div className="font-semibold text-emerald-200">{formatNum(mealPlan.totals.fat)}g</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meal Sections */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                {/* Breakfast */}
                <div className="p-3 bg-amber-900/20 rounded-xl border border-amber-500/20">
                  <h4 className="text-sm font-medium text-amber-300 mb-2 flex items-center gap-2">
                    🌅 Breakfast
                  </h4>
                  <div className="space-y-1">
                    {mealPlan.breakfast.map((food) => (
                      <div key={food.id} className="flex items-center gap-2 text-xs text-emerald-200">
                        <span>{food.emoji}</span>
                        <span className="flex-1">{food.name}</span>
                        <span className="text-emerald-400/70">{food.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lunch */}
                <div className="p-3 bg-orange-900/20 rounded-xl border border-orange-500/20">
                  <h4 className="text-sm font-medium text-orange-300 mb-2 flex items-center gap-2">
                    ☀️ Lunch
                  </h4>
                  <div className="space-y-1">
                    {mealPlan.lunch.map((food) => (
                      <div key={food.id} className="flex items-center gap-2 text-xs text-emerald-200">
                        <span>{food.emoji}</span>
                        <span className="flex-1">{food.name}</span>
                        <span className="text-emerald-400/70">{food.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dinner */}
                <div className="p-3 bg-indigo-900/20 rounded-xl border border-indigo-500/20">
                  <h4 className="text-sm font-medium text-indigo-300 mb-2 flex items-center gap-2">
                    🌙 Dinner
                  </h4>
                  <div className="space-y-1">
                    {mealPlan.dinner.map((food) => (
                      <div key={food.id} className="flex items-center gap-2 text-xs text-emerald-200">
                        <span>{food.emoji}</span>
                        <span className="flex-1">{food.name}</span>
                        <span className="text-emerald-400/70">{food.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Snacks */}
                <div className="p-3 bg-pink-900/20 rounded-xl border border-pink-500/20">
                  <h4 className="text-sm font-medium text-pink-300 mb-2 flex items-center gap-2">
                    🍎 Snacks
                  </h4>
                  <div className="space-y-1">
                    {mealPlan.snacks.map((food) => (
                      <div key={food.id} className="flex items-center gap-2 text-xs text-emerald-200">
                        <span>{food.emoji}</span>
                        <span className="flex-1">{food.name}</span>
                        <span className="text-emerald-400/70">{food.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 border-t border-emerald-500/20 bg-emerald-950/50">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addMealPlan}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add All to Today's Log
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default FoodPanel;

