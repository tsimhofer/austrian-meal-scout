// Mahlzeit Österreich - Calendar SPA & Multi-Week Planner

const FAVORITES_STORAGE_KEY = 'austrian_meal_favorites';

const state = {
  plan: null,
  activeWeekIndex: 0,
  weeksCount: 1,
  calendarViewMode: 'week', // 'week' or 'multi'
  servings: 2,
  tagFilter: 'all',
  includeLunches: false,
  ingredientScope: 'activeWeek', // 'activeWeek' or 'allWeeks'
  ingredients: [],
  selectedCategory: 'all',
  scoutResult: null,
  scoutViewMode: 'split',
  checkedShoppingItems: new Set(),
  excludedAllergens: new Set(),
  favorites: new Set(),
  currentModalMealId: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  loadFavorites();
  updateFavoritesBadge();
  await rollEntirePlan();
});

// --- Favorites Storage & Toggle ---

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        state.favorites = new Set(arr);
      }
    }
  } catch (e) {
    console.error('Error loading favorites from localStorage', e);
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(state.favorites)));
  } catch (e) {
    console.error('Error saving favorites to localStorage', e);
  }
}

function updateFavoritesBadge() {
  const badge = document.getElementById('badge-favorites-count');
  if (badge) {
    badge.innerText = state.favorites.size;
  }
}

function toggleFavorite(mealId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  if (!mealId) return;

  const isFav = state.favorites.has(mealId);
  if (isFav) {
    state.favorites.delete(mealId);
    showToast('Aus Favoriten entfernt 🤍');
  } else {
    state.favorites.add(mealId);
    showToast('Zu Favoriten hinzugefügt! ❤️');
  }

  saveFavorites();
  updateFavoritesBadge();
  updateFavoriteIconsOnPage(mealId);

  if (state.tagFilter === 'favorites') {
    rollEntirePlan();
  }
}

function toggleFavoriteFromModal() {
  if (state.currentModalMealId) {
    toggleFavorite(state.currentModalMealId);
  }
}

function updateFavoriteIconsOnPage(mealId) {
  const isFav = state.favorites.has(mealId);

  document.querySelectorAll(`.fav-btn-${mealId}`).forEach(btn => {
    const icon = btn.querySelector('.fav-icon');
    if (icon) {
      icon.innerText = isFav ? '❤️' : '🤍';
    }
    if (isFav) {
      btn.classList.add('text-red-500');
      btn.classList.remove('text-slate-400');
    } else {
      btn.classList.remove('text-red-500');
      btn.classList.add('text-slate-400');
    }
  });

  if (state.currentModalMealId === mealId) {
    const modalHeart = document.getElementById('modal-fav-heart');
    const modalBtn = document.getElementById('modal-fav-btn');
    if (modalHeart) modalHeart.innerText = isFav ? '❤️' : '🤍';
    if (modalBtn) {
      if (isFav) {
        modalBtn.className = 'w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center transition cursor-pointer shadow-xs';
      } else {
        modalBtn.className = 'w-9 h-9 rounded-full bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition cursor-pointer';
      }
    }
  }
}

// --- Allergens & Intolerances ---

function toggleAllergenFilter(allergen) {
  if (state.excludedAllergens.has(allergen)) {
    state.excludedAllergens.delete(allergen);
  } else {
    state.excludedAllergens.add(allergen);
  }

  updateAllergenPillStyles();
  rollEntirePlan();
}

function resetAllergenFilters() {
  state.excludedAllergens.clear();
  updateAllergenPillStyles();
  rollEntirePlan();
  showToast('Allergie-Filter zurückgesetzt');
}

function updateAllergenPillStyles() {
  const resetBtn = document.getElementById('btn-reset-allergens');
  if (resetBtn) {
    if (state.excludedAllergens.size > 0) {
      resetBtn.classList.remove('hidden');
    } else {
      resetBtn.classList.add('hidden');
    }
  }

  document.querySelectorAll('.allergen-pill').forEach(btn => {
    const allergen = btn.getAttribute('data-allergen');
    if (state.excludedAllergens.has(allergen)) {
      btn.className = 'allergen-pill px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400/40 transition flex items-center gap-1 cursor-pointer';
    } else {
      btn.className = 'allergen-pill px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent transition flex items-center gap-1 cursor-pointer';
    }
  });
}

// --- Tab Navigation ---

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.remove('active', 'bg-red-50', 'text-red-700');
    el.classList.add('text-slate-600');
  });

  const activeContent = document.getElementById(`tab-${tabName}`);
  const activeNav = document.getElementById(`nav-tab-${tabName}`);

  if (activeContent) activeContent.classList.remove('hidden');
  if (activeNav) {
    activeNav.classList.add('active', 'bg-red-50', 'text-red-700');
    activeNav.classList.remove('text-slate-600');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

function proceedToIngredients() {
  switchTab('ingredients');
}

// --- Multi-Week Planning Horizon & Navigation ---

function setWeeksCount(num) {
  state.weeksCount = num;
  state.activeWeekIndex = 0;

  document.querySelectorAll('.horizon-pill').forEach(btn => {
    btn.className = 'horizon-pill px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer';
  });
  const activeBtn = document.getElementById(`horizon-btn-${num}`);
  if (activeBtn) {
    activeBtn.className = 'horizon-pill active px-2.5 py-1 rounded-lg bg-white shadow-xs text-red-700 font-bold transition cursor-pointer';
  }

  rollEntirePlan();
}

function changeActiveWeek(delta) {
  if (!state.plan || !state.plan.weeks) return;
  const newIndex = state.activeWeekIndex + delta;
  if (newIndex >= 0 && newIndex < state.plan.weeks.length) {
    state.activeWeekIndex = newIndex;
    updateWeekNavigationUI();
    renderCurrentCalendarView();
    if (state.ingredientScope === 'activeWeek') {
      fetchAggregatedIngredients();
    }
  }
}

function setActiveWeekDirectly(weekIndex) {
  if (!state.plan || !state.plan.weeks) return;
  if (weekIndex >= 0 && weekIndex < state.plan.weeks.length) {
    state.activeWeekIndex = weekIndex;
    setCalendarViewMode('week');
    updateWeekNavigationUI();
    renderCurrentCalendarView();
    if (state.ingredientScope === 'activeWeek') {
      fetchAggregatedIngredients();
    }
  }
}

function updateWeekNavigationUI() {
  if (!state.plan || !state.plan.weeks || state.plan.weeks.length === 0) return;

  const currentWeek = state.plan.weeks[state.activeWeekIndex] || state.plan.weeks[0];
  const labelEl = document.getElementById('calendar-week-label');
  const indexBadge = document.getElementById('calendar-week-index-badge');
  const prevBtn = document.getElementById('btn-prev-week');
  const nextBtn = document.getElementById('btn-next-week');

  if (labelEl) labelEl.innerText = currentWeek.label;
  if (indexBadge) {
    indexBadge.innerText = `Woche ${state.activeWeekIndex + 1} von ${state.plan.weeks.length}`;
  }

  if (prevBtn) prevBtn.disabled = (state.activeWeekIndex === 0);
  if (nextBtn) nextBtn.disabled = (state.activeWeekIndex >= state.plan.weeks.length - 1);

  renderIngredientScopePills();
}

function setCalendarViewMode(mode) {
  state.calendarViewMode = mode;
  const weekView = document.getElementById('calendar-week-view');
  const multiView = document.getElementById('calendar-multi-view');
  const btnWeek = document.getElementById('view-mode-week');
  const btnMulti = document.getElementById('view-mode-multi');

  if (mode === 'week') {
    if (weekView) weekView.classList.remove('hidden');
    if (multiView) multiView.classList.add('hidden');
    if (btnWeek) btnWeek.className = 'px-3 py-1.5 rounded-lg font-bold bg-slate-900 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer';
    if (btnMulti) btnMulti.className = 'px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer';
  } else {
    if (weekView) weekView.classList.add('hidden');
    if (multiView) multiView.classList.remove('hidden');
    if (btnMulti) btnMulti.className = 'px-3 py-1.5 rounded-lg font-bold bg-slate-900 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer';
    if (btnWeek) btnWeek.className = 'px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5 cursor-pointer';
  }

  renderCurrentCalendarView();
  lucide.createIcons();
}

function renderCurrentCalendarView() {
  if (state.calendarViewMode === 'week') {
    renderWeeklyCalendarGrid();
  } else {
    renderMultiWeekOverview();
  }
}

// --- Plan Generation & Reroll ---

async function rollEntirePlan() {
  try {
    if (state.tagFilter === 'favorites' && state.favorites.size === 0) {
      showToast('Noch keine Favoriten gespeichert! Klicke auf das Herz ❤️ bei deinen Lieblingsgerichten.');
    }

    const payload = {
      tagFilter: state.tagFilter,
      servings: state.servings,
      includeLunches: state.includeLunches,
      weeksCount: state.weeksCount,
      excludedAllergens: Array.from(state.excludedAllergens),
      favoriteMealIds: Array.from(state.favorites)
    };

    const res = await fetch('/api/plan/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Fehler beim Generieren des Kalenderplans');
    const data = await res.json();
    state.plan = data.plan;
    state.ingredients = data.ingredients || [];

    updateWeekNavigationUI();
    renderCurrentCalendarView();
    renderIngredients();
    updateIngredientBadge();

    const weekText = state.weeksCount === 1 ? '1 Woche' : `${state.weeksCount} Wochen`;
    showToast(`Speiseplan für ${weekText} vorhergesagt! 📅`);
  } catch (err) {
    console.error(err);
    showToast('Fehler beim Würfeln des Plans.');
  }
}

async function rerollSingleMeal(dayIndex, mealType, weekIndex = null) {
  try {
    const wIdx = (weekIndex !== null) ? weekIndex : state.activeWeekIndex;
    const currentWeek = state.plan.weeks[wIdx];
    if (!currentWeek) return;

    const currentMealIds = [];
    currentWeek.days.forEach(d => {
      if (d.lunch) currentMealIds.push(d.lunch.id);
      if (d.dinner) currentMealIds.push(d.dinner.id);
    });

    const payload = {
      tagFilter: state.tagFilter,
      currentMealIds,
      excludedAllergens: Array.from(state.excludedAllergens),
      favoriteMealIds: Array.from(state.favorites)
    };

    const res = await fetch('/api/plan/reroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Fehler beim Neu-Würfeln');
    const newMeal = await res.json();

    if (mealType === 'lunch') {
      currentWeek.days[dayIndex].lunch = newMeal;
    } else {
      currentWeek.days[dayIndex].dinner = newMeal;
    }

    renderCurrentCalendarView();
    await fetchAggregatedIngredients();
    showToast(`${newMeal.name} gewählt! 🍲`);
  } catch (err) {
    console.error(err);
    showToast('Fehler beim Neu-Würfeln.');
  }
}

// --- Calendar Rendering ---

function renderWeeklyCalendarGrid() {
  const container = document.getElementById('weekly-plan-grid');
  if (!container || !state.plan || !state.plan.weeks) return;

  const currentWeek = state.plan.weeks[state.activeWeekIndex];
  if (!currentWeek) return;

  // Update Nutrition Summary Banner
  updateNutritionBanner(currentWeek);

  container.innerHTML = currentWeek.days.map((day, idx) => {
    // Calculate total daily macros
    const dayMeals = [];
    if (day.lunch) dayMeals.push(day.lunch);
    if (day.dinner) dayMeals.push(day.dinner);

    const dayTotalCalories = dayMeals.reduce((acc, m) => acc + (m.nutrition?.calories || 550), 0);
    const dayTotalProtein = dayMeals.reduce((acc, m) => acc + (m.nutrition?.protein || 25), 0);

    return `
      <div class="calendar-day-col bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden ${day.isToday ? 'ring-2 ring-red-500/80 shadow-md' : ''}">
        <!-- Day Column Header -->
        <div class="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span class="font-extrabold text-sm text-slate-900 block leading-tight">${day.dayName}</span>
            <span class="text-xs font-semibold text-slate-500">${day.formattedDate || `Tag ${idx + 1}`}</span>
          </div>
          ${day.isToday ? `
            <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white shadow-2xs">Heute</span>
          ` : `
            <span class="text-[10px] font-bold text-slate-400">#${idx + 1}</span>
          `}
        </div>

        <!-- Meals in Day -->
        <div class="p-2.5 space-y-2.5 flex-grow">
          ${day.lunch ? renderCalendarMealCard(day.lunch, idx, 'lunch', 'Mittagessen', state.activeWeekIndex) : ''}
          ${day.dinner ? renderCalendarMealCard(day.dinner, idx, 'dinner', state.includeLunches ? 'Abendessen' : 'Hauptgericht', state.activeWeekIndex) : ''}
        </div>

        <!-- Day Footer Summary -->
        <div class="p-2.5 bg-slate-50/80 border-t border-slate-100 text-center text-[11px] text-slate-500 font-semibold flex items-center justify-around">
          <span>🔥 ${dayTotalCalories} kcal</span>
          <span class="text-slate-300">•</span>
          <span>💪 ${dayTotalProtein}g Protein</span>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function renderCalendarMealCard(meal, dayIndex, type, titleLabel, weekIndex) {
  const n = meal.nutrition || { calories: 550, protein: 25, carbs: 55, fat: 22, fiber: 5 };
  const isFav = state.favorites.has(meal.id);

  // Allergens chips
  const allergenBadges = [];
  if (meal.allergens && meal.allergens.length > 0) {
    if (meal.allergens.includes('gluten')) allergenBadges.push('<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">🌾 Gluten</span>');
    if (meal.allergens.includes('lactose')) allergenBadges.push('<span class="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">🥛 Laktose</span>');
    if (meal.allergens.includes('egg')) allergenBadges.push('<span class="text-[9px] px-1.5 py-0.2 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">🥚 Ei</span>');
    if (meal.allergens.includes('fish')) allergenBadges.push('<span class="text-[9px] px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">🐟 Fisch</span>');
    if (meal.allergens.includes('nuts')) allergenBadges.push('<span class="text-[9px] px-1.5 py-0.2 rounded bg-orange-50 text-orange-800 border border-orange-200">🥜 Nüsse</span>');
  } else {
    allergenBadges.push('<span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">✅ Frei</span>');
  }

  // Diet chip
  let dietBadge = '';
  if (meal.tags.includes('vegan')) {
    dietBadge = '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">🌿 Vegan</span>';
  } else if (meal.tags.includes('vegetarian')) {
    dietBadge = '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-green-100 text-green-800">🌱 Veggie</span>';
  }

  return `
    <div class="calendar-meal-card bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition relative group">
      <!-- Slot Label & Action Icons -->
      <div class="flex items-center justify-between gap-1 mb-1.5">
        <div class="flex items-center gap-1 flex-wrap">
          <span class="text-[10px] font-extrabold text-red-700 uppercase tracking-wider">${titleLabel}</span>
          ${dietBadge}
        </div>
        <div class="flex items-center gap-0.5">
          <!-- Favorite toggle -->
          <button onclick="toggleFavorite('${meal.id}', event)" title="Favorit umschalten" class="fav-btn-${meal.id} ${isFav ? 'text-red-500' : 'text-slate-400'} hover:text-red-500 p-1 rounded transition cursor-pointer">
            <span class="fav-icon text-xs select-none">${isFav ? '❤️' : '🤍'}</span>
          </button>
          <!-- Reroll button -->
          <button onclick="rerollSingleMeal(${dayIndex}, '${type}', ${weekIndex})" title="Gericht neu würfeln" class="text-slate-400 hover:text-red-600 p-1 rounded transition cursor-pointer">
            <i data-lucide="refresh-cw" class="w-3 h-3"></i>
          </button>
        </div>
      </div>

      <!-- Meal Title & Emoji -->
      <div class="flex items-start gap-2">
        <span class="text-xl select-none shrink-0">${meal.emoji || '🍲'}</span>
        <div class="min-w-0 flex-grow">
          <h4 class="font-bold text-slate-900 text-xs leading-snug line-clamp-2" title="${meal.name}">${meal.name}</h4>
          <span class="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
            <i data-lucide="clock" class="w-2.5 h-2.5 text-slate-400"></i>
            <span>${meal.prepTimeMinutes} Min</span> • <span>${meal.category}</span>
          </span>
        </div>
      </div>

      <!-- Allergens Chips -->
      <div class="mt-2 flex flex-wrap gap-1">
        ${allergenBadges.join('')}
      </div>

      <!-- Nutrition & Recipe Link -->
      <div class="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
        <span class="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
          🔥 ${n.calories} kcal • ${n.protein}g P
        </span>
        <button onclick="openRecipeModal('${meal.id}')" class="font-bold text-red-600 hover:text-red-800 flex items-center gap-0.5 cursor-pointer">
          <span>Rezept</span>
          <i data-lucide="chevron-right" class="w-2.5 h-2.5"></i>
        </button>
      </div>
    </div>
  `;
}

function renderMultiWeekOverview() {
  const container = document.getElementById('calendar-multi-view');
  if (!container || !state.plan || !state.plan.weeks) return;

  container.innerHTML = state.plan.weeks.map((week, wIdx) => {
    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <!-- Week Header -->
        <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-base font-black text-slate-900">${week.label}</span>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
              Woche ${wIdx + 1}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-500 font-semibold">
              Ø ${week.nutritionSummary?.averageCalories || 550} kcal / Mahlzeit
            </span>
            <button onclick="setActiveWeekDirectly(${wIdx})" class="text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-1 cursor-pointer">
              <span>Woche im Kalender öffnen</span>
              <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- 7 Days in Week Row -->
        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          ${week.days.map((day, dIdx) => {
            const mainMeal = day.dinner || day.lunch;
            return `
              <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-xs transition">
                <div class="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>${day.dayName.slice(0, 2)} ${day.formattedDate || ''}</span>
                  ${day.isToday ? '<span class="text-[9px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black">Heute</span>' : ''}
                </div>
                ${mainMeal ? `
                  <div class="flex items-start gap-1.5">
                    <span class="text-lg">${mainMeal.emoji || '🍲'}</span>
                    <div class="min-w-0">
                      <p class="font-bold text-xs text-slate-900 leading-snug truncate" title="${mainMeal.name}">${mainMeal.name}</p>
                      <span class="text-[10px] text-slate-500">${mainMeal.nutrition?.calories || 550} kcal</span>
                    </div>
                  </div>
                ` : '<span class="text-xs text-slate-400">Keine Mahlzeit</span>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function updateNutritionBanner(week) {
  const summary = week?.nutritionSummary || state.plan?.overallNutritionSummary;
  if (!summary) return;

  const elCal = document.getElementById('nutri-avg-calories');
  const elProt = document.getElementById('nutri-avg-protein');
  const elCarbs = document.getElementById('nutri-avg-carbs');
  const elFat = document.getElementById('nutri-avg-fat');

  if (elCal) elCal.innerText = `${summary.averageCalories} kcal`;
  if (elProt) elProt.innerText = `${summary.averageProtein} g`;
  if (elCarbs) elCarbs.innerText = `${summary.averageCarbs} g`;
  if (elFat) elFat.innerText = `${summary.averageFat} g`;
}

function onServingsChange(val) {
  state.servings = parseInt(val, 10);
  if (state.plan) {
    state.plan.servings = state.servings;
    fetchAggregatedIngredients();
  }
}

function onToggleLunch(checked) {
  state.includeLunches = checked;
  rollEntirePlan();
}

function setDietFilter(filter) {
  state.tagFilter = filter;
  document.querySelectorAll('.diet-filter-pill').forEach(btn => {
    if (btn.getAttribute('data-filter') === filter) {
      btn.className = 'diet-filter-pill active px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 transition';
    } else {
      btn.className = 'diet-filter-pill px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    }
  });
  rollEntirePlan();
}

// --- Ingredients & Multi-Week Scope Operations ---

function renderIngredientScopePills() {
  const container = document.getElementById('ingredient-scope-pills');
  if (!container || !state.plan || !state.plan.weeks) return;

  const weeks = state.plan.weeks;
  let html = '';

  weeks.forEach((w, idx) => {
    const isActive = (state.ingredientScope === 'activeWeek' && state.activeWeekIndex === idx);
    html += `
      <button onclick="setIngredientScope('activeWeek', ${idx})" class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
        isActive
          ? 'bg-red-600 text-white shadow-xs'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }">
        Woche ${idx + 1} (${w.days[0]?.formattedDate || 'KW ' + w.weekNumber})
      </button>
    `;
  });

  if (weeks.length > 1) {
    const isAllActive = (state.ingredientScope === 'allWeeks');
    html += `
      <button onclick="setIngredientScope('allWeeks')" class="px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
        isAllActive
          ? 'bg-slate-900 text-white shadow-xs'
          : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
      }">
        <span>🛒 Alle ${weeks.length} Wochen (Gesamt-Großeinkauf)</span>
      </button>
    `;
  }

  container.innerHTML = html;
}

function setIngredientScope(scope, weekIdx = null) {
  state.ingredientScope = scope;
  if (weekIdx !== null) {
    state.activeWeekIndex = weekIdx;
    updateWeekNavigationUI();
    renderCurrentCalendarView();
  }
  renderIngredientScopePills();
  fetchAggregatedIngredients();
}

async function fetchAggregatedIngredients() {
  if (!state.plan) return;
  try {
    const mealIds = [];

    if (state.ingredientScope === 'allWeeks') {
      state.plan.weeks.forEach(w => {
        w.days.forEach(d => {
          if (d.lunch) mealIds.push(d.lunch.id);
          if (d.dinner) mealIds.push(d.dinner.id);
        });
      });
    } else {
      const activeWeek = state.plan.weeks[state.activeWeekIndex] || state.plan.weeks[0];
      if (activeWeek) {
        activeWeek.days.forEach(d => {
          if (d.lunch) mealIds.push(d.lunch.id);
          if (d.dinner) mealIds.push(d.dinner.id);
        });
      }
    }

    const res = await fetch('/api/ingredients/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mealIds,
        servings: state.servings,
        excludePantryStaples: false
      })
    });

    if (!res.ok) throw new Error('Fehler beim Aggregieren der Zutaten');
    state.ingredients = await res.json();
    renderIngredients();
    updateIngredientBadge();
  } catch (err) {
    console.error(err);
  }
}

function updateIngredientBadge() {
  const activeCount = state.ingredients.filter(i => i.checked).length;
  const badge = document.getElementById('badge-ingredients-count');
  if (badge) badge.innerText = activeCount;
}

function renderIngredients() {
  const container = document.getElementById('ingredients-container');
  const filtersContainer = document.getElementById('ingredient-category-filters');
  if (!container || !state.ingredients) return;

  const categories = ['all', ...new Set(state.ingredients.map(i => i.category))];

  if (filtersContainer) {
    filtersContainer.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'Alle Kategorien' : cat;
      const count = cat === 'all'
        ? state.ingredients.length
        : state.ingredients.filter(i => i.category === cat).length;
      const isActive = state.selectedCategory === cat;

      return `
        <button onclick="setIngredientCategoryFilter('${cat}')" class="px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
          isActive
            ? 'bg-slate-900 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }">
          ${label} (${count})
        </button>
      `;
    }).join('');
  }

  const filtered = state.selectedCategory === 'all'
    ? state.ingredients
    : state.ingredients.filter(i => i.category === state.selectedCategory);

  const grouped = {};
  filtered.forEach((item, index) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ item, originalIndex: state.ingredients.indexOf(item) });
  });

  container.innerHTML = Object.entries(grouped).map(([cat, list]) => {
    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="bg-slate-50/80 px-5 py-3 border-b border-slate-200/80 flex items-center justify-between">
          <span class="font-bold text-sm text-slate-800">${cat}</span>
          <span class="text-xs text-slate-500 font-semibold">${list.length} Artikel</span>
        </div>
        <div class="divide-y divide-slate-100">
          ${list.map(({ item, originalIndex }) => `
            <div class="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition">
              <label class="flex items-center gap-3 cursor-pointer select-none flex-grow">
                <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleIngredient(${originalIndex}, this.checked)" class="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer">
                <div>
                  <span class="text-sm font-semibold ${item.checked ? 'text-slate-900' : 'text-slate-400 line-through'}">${item.name}</span>
                  ${item.usedInMeals && item.usedInMeals.length > 0 ? `
                    <p class="text-xs text-slate-400">Verwendet in: ${item.usedInMeals.join(', ')}</p>
                  ` : ''}
                </div>
              </label>
              <div class="flex items-center gap-3">
                <span class="text-sm font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  ${item.totalAmount > 0 ? item.totalAmount : ''} ${item.unit}
                </span>
                <button onclick="removeIngredient(${originalIndex})" title="Entfernen" class="text-slate-300 hover:text-red-500 p-1 rounded transition cursor-pointer">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function setIngredientCategoryFilter(cat) {
  state.selectedCategory = cat;
  renderIngredients();
}

function toggleIngredient(index, checked) {
  if (state.ingredients[index]) {
    state.ingredients[index].checked = checked;
    updateIngredientBadge();
    renderIngredients();
  }
}

function toggleAllIngredients(checked) {
  state.ingredients.forEach(i => i.checked = checked);
  updateIngredientBadge();
  renderIngredients();
}

function handleCustomItemKey(e) {
  if (e.key === 'Enter') addCustomItem();
}

function addCustomItem() {
  const input = document.getElementById('custom-item-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  state.ingredients.push({
    name,
    searchTerm: name,
    totalAmount: 1,
    unit: 'Stk',
    category: 'Sonstiges',
    isPantryStaple: false,
    checked: true,
    usedInMeals: ['Eigene Ergänzung']
  });

  input.value = '';
  renderIngredients();
  updateIngredientBadge();
  showToast(`"${name}" zur Einkaufsliste hinzugefügt! 🛒`);
}

function removeIngredient(index) {
  if (state.ingredients[index]) {
    const removed = state.ingredients.splice(index, 1)[0];
    renderIngredients();
    updateIngredientBadge();
    showToast(`"${removed.name}" entfernt.`);
  }
}

// --- Supermarket Scout Operations ---

async function scoutSupermarkets() {
  switchTab('scout');

  const loadingEl = document.getElementById('scout-loading');
  const resultsEl = document.getElementById('scout-results');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (resultsEl) resultsEl.classList.add('hidden');

  try {
    const res = await fetch('/api/scout/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.ingredients)
    });

    if (!res.ok) throw new Error('Fehler beim Scouten der Supermärkte');
    state.scoutResult = await res.json();

    document.getElementById('stat-spar-total').innerText = `${state.scoutResult.sparTotal.toFixed(2)} €`;
    document.getElementById('stat-billa-total').innerText = `${state.scoutResult.billaTotal.toFixed(2)} €`;
    document.getElementById('stat-hofer-total').innerText = `${state.scoutResult.hoferTotal.toFixed(2)} €`;
    document.getElementById('stat-optimized-total').innerText = `${state.scoutResult.optimizedCheapestTotal.toFixed(2)} €`;

    const savingsText = document.getElementById('stat-savings-text');
    if (savingsText) {
      if (state.scoutResult.potentialSavings > 0) {
        savingsText.innerText = `Spare ${state.scoutResult.potentialSavings.toFixed(2)} € mit Bestpreis-Mix!`;
      } else {
        savingsText.innerText = `Bester Einzelmarkt: ${state.scoutResult.bestSingleStore}`;
      }
    }

    renderScoutViews();

    const badge = document.getElementById('badge-scout-status');
    if (badge) badge.classList.remove('hidden');

    showToast('Supermärkte erfolgreich gescoutet! 🎯');
  } catch (err) {
    console.error(err);
    showToast('Fehler bei der Preisabfrage.');
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.remove('hidden');
    lucide.createIcons();
  }
}

function setScoutViewMode(mode) {
  state.scoutViewMode = mode;
  const splitView = document.getElementById('scout-split-view');
  const compView = document.getElementById('scout-comparison-view');
  const btnSplit = document.getElementById('view-mode-split');
  const btnComp = document.getElementById('view-mode-comparison');

  if (mode === 'split') {
    if (splitView) splitView.classList.remove('hidden');
    if (compView) compView.classList.add('hidden');
    if (btnSplit) btnSplit.className = 'view-mode-btn active flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg bg-white shadow-xs text-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer';
    if (btnComp) btnComp.className = 'view-mode-btn flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer';
  } else {
    if (splitView) splitView.classList.add('hidden');
    if (compView) compView.classList.remove('hidden');
    if (btnComp) btnComp.className = 'view-mode-btn active flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold rounded-lg bg-white shadow-xs text-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer';
    if (btnSplit) btnSplit.className = 'view-mode-btn flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5 cursor-pointer';
  }
}

function renderScoutViews() {
  renderSplitView();
  renderComparisonTable();
}

function renderSplitView() {
  const container = document.getElementById('scout-split-view');
  if (!container || !state.scoutResult) return;

  const stores = [
    { key: 'SPAR', name: 'SPAR / Interspar', color: 'emerald', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', tag: 'Live API' },
    { key: 'BILLA', name: 'BILLA / REWE', color: 'yellow', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200', tag: 'Live API' },
    { key: 'HOFER', name: 'HOFER', color: 'blue', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200', tag: 'Discounter' }
  ];

  container.innerHTML = stores.map(store => {
    const assignedItems = state.scoutResult.items.filter(i => i.recommendedStore === store.key);
    const storeSubtotal = assignedItems.reduce((acc, curr) => acc + curr.recommendedPrice, 0);

    if (assignedItems.length === 0) return '';

    return `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <span class="w-3.5 h-3.5 rounded-full bg-${store.color}-500"></span>
            <h3 class="font-extrabold text-base text-slate-900">Kaufe bei ${store.name}</h3>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full border ${store.badgeClass}">${store.tag}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-500 font-semibold">${assignedItems.length} Artikel</span>
            <span class="text-base font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
              Zwischensumme: ${storeSubtotal.toFixed(2)} €
            </span>
          </div>
        </div>

        <div class="divide-y divide-slate-100">
          ${assignedItems.map(item => {
            const product = item.availableProducts.find(p => p.store === store.key) || item.availableProducts[0];
            const itemKey = `${store.key}_${item.name}`;
            const isChecked = state.checkedShoppingItems.has(itemKey);

            return `
              <div class="shopping-item p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition ${isChecked ? 'checked' : ''}">
                <div class="flex items-start sm:items-center gap-3.5 flex-grow">
                  <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleShoppingItem('${itemKey}')" class="mt-1 sm:mt-0 w-5 h-5 rounded text-red-600 focus:ring-red-500 cursor-pointer">

                  ${product && product.imageUrl ? `
                    <img src="${product.imageUrl}" alt="${product.name}" class="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0" onerror="this.style.display='none'">
                  ` : `
                    <div class="w-12 h-12 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                      <i data-lucide="package" class="w-6 h-6"></i>
                    </div>
                  `}

                  <div class="item-text min-w-0 flex-grow">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="font-bold text-slate-900 text-sm">${item.name}</h4>
                      <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">${item.amount > 0 ? item.amount : ''} ${item.unit}</span>
                      ${product && product.isBio ? '<span class="text-xs font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">BIO</span>' : ''}
                    </div>
                    <p class="text-xs text-slate-500 truncate mt-0.5">
                      ${product ? `${product.brand ? product.brand + ' • ' : ''}${product.name}` : item.name}
                    </p>
                    ${product && product.unitPrice ? `
                      <span class="text-[11px] text-slate-400 font-medium">${product.unitPrice}</span>
                    ` : ''}
                  </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-8 sm:pl-0">
                  <div class="text-right">
                    <div class="text-base font-extrabold text-slate-900">${product ? product.price.toFixed(2) : item.recommendedPrice.toFixed(2)} €</div>
                    <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Günstigste Wahl</span>
                  </div>

                  ${product && product.productUrl ? `
                    <a href="${product.productUrl}" target="_blank" rel="noopener noreferrer" title="Im Supermarkt-Online-Shop ansehen" class="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-slate-100 transition">
                      <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function renderComparisonTable() {
  const tbody = document.getElementById('comparison-table-body');
  if (!tbody || !state.scoutResult) return;

  tbody.innerHTML = state.scoutResult.items.map(item => {
    const spar = item.availableProducts.find(p => p.store === 'SPAR');
    const billa = item.availableProducts.find(p => p.store === 'BILLA');
    const hofer = item.availableProducts.find(p => p.store === 'HOFER');

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4 font-bold text-slate-900 text-xs">${item.name}</td>
        <td class="py-3 px-4 text-xs font-semibold text-slate-600">${item.amount > 0 ? item.amount : ''} ${item.unit}</td>
        <td class="py-3 px-4 text-xs ${spar && spar.isCheapest ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-600'}">
          ${spar ? `${spar.price.toFixed(2)} € <span class="text-[10px] text-slate-400 block">${spar.brand}</span>` : '—'}
        </td>
        <td class="py-3 px-4 text-xs ${billa && billa.isCheapest ? 'font-bold text-yellow-700 bg-yellow-50/50' : 'text-slate-600'}">
          ${billa ? `${billa.price.toFixed(2)} € <span class="text-[10px] text-slate-400 block">${billa.brand}</span>` : '—'}
        </td>
        <td class="py-3 px-4 text-xs ${hofer && hofer.isCheapest ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-slate-600'}">
          ${hofer ? `${hofer.price.toFixed(2)} € <span class="text-[10px] text-slate-400 block">${hofer.brand}</span>` : '—'}
        </td>
        <td class="py-3 px-4 text-xs font-extrabold text-red-700">
          ${item.recommendedStore} (${item.recommendedPrice.toFixed(2)} €)
        </td>
      </tr>
    `;
  }).join('');
}

function toggleShoppingItem(key) {
  if (state.checkedShoppingItems.has(key)) {
    state.checkedShoppingItems.delete(key);
  } else {
    state.checkedShoppingItems.add(key);
  }
  renderSplitView();
}

// --- Utilities: Export & Copy ---

function copyShoppingListToClipboard() {
  if (!state.scoutResult || !state.scoutResult.items) {
    showToast('Bitte zuerst die Preise scouten.');
    return;
  }

  let text = `🛒 *Mahlzeit Österreich – Einkaufsliste*\n`;
  text += `👥 Portionen: ${state.servings} Personen\n`;
  text += `💰 Gesamt (Bestpreis): ${state.scoutResult.optimizedCheapestTotal.toFixed(2)} €\n\n`;

  const stores = ['SPAR', 'BILLA', 'HOFER'];
  stores.forEach(s => {
    const items = state.scoutResult.items.filter(i => i.recommendedStore === s);
    if (items.length > 0) {
      const subtotal = items.reduce((a, b) => a + b.recommendedPrice, 0);
      text += `📍 *${s}* (${subtotal.toFixed(2)} €):\n`;
      items.forEach(it => {
        text += `  [ ] ${it.name} (${it.amount > 0 ? it.amount + ' ' + it.unit : ''}) ~ ${it.recommendedPrice.toFixed(2)} €\n`;
      });
      text += `\n`;
    }
  });

  navigator.clipboard.writeText(text).then(() => {
    showToast('Einkaufsliste in Zwischenablage kopiert! 📋');
  }).catch(() => {
    showToast('Konnte nicht in Zwischenablage kopieren.');
  });
}

// --- Recipe Detail Modal ---

async function openRecipeModal(mealId) {
  try {
    const res = await fetch(`/api/meals/${mealId}`);
    if (!res.ok) throw new Error('Rezept nicht gefunden');
    const meal = await res.json();

    state.currentModalMealId = meal.id;

    document.getElementById('modal-meal-emoji').innerText = meal.emoji || '🍲';
    document.getElementById('modal-meal-name').innerText = meal.name;
    document.getElementById('modal-meal-desc').innerText = meal.description;
    document.getElementById('modal-meal-time').innerText = `⏱️ ${meal.prepTimeMinutes} Min`;
    document.getElementById('modal-meal-category').innerText = meal.category;
    document.getElementById('modal-meal-difficulty').innerText = meal.difficulty;

    const isFav = state.favorites.has(meal.id);
    const modalHeart = document.getElementById('modal-fav-heart');
    const modalBtn = document.getElementById('modal-fav-btn');
    if (modalHeart) modalHeart.innerText = isFav ? '❤️' : '🤍';
    if (modalBtn) {
      if (isFav) {
        modalBtn.className = 'w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center transition cursor-pointer shadow-xs';
      } else {
        modalBtn.className = 'w-9 h-9 rounded-full bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition cursor-pointer';
      }
    }

    const n = meal.nutrition || { calories: 550, protein: 25, carbs: 55, fat: 22, fiber: 5 };
    const elCal = document.getElementById('modal-nutri-calories');
    const elProt = document.getElementById('modal-nutri-protein');
    const elCarbs = document.getElementById('modal-nutri-carbs');
    const elFat = document.getElementById('modal-nutri-fat');
    if (elCal) elCal.innerText = `${n.calories} kcal`;
    if (elProt) elProt.innerText = `${n.protein} g`;
    if (elCarbs) elCarbs.innerText = `${n.carbs} g`;
    if (elFat) elFat.innerText = `${n.fat} g`;

    const modalAllergensEl = document.getElementById('modal-meal-allergens');
    if (modalAllergensEl) {
      const tagsHtml = [];
      if (meal.tags.includes('vegan')) {
        tagsHtml.push('<span class="font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800">🌿 100% Vegan (Pflanzlich)</span>');
      } else if (meal.tags.includes('vegetarian')) {
        tagsHtml.push('<span class="font-bold px-2 py-1 rounded bg-green-100 text-green-800">🌱 Vegetarisch</span>');
      }
      if (meal.tags.includes('austrian')) {
        tagsHtml.push('<span class="font-bold px-2 py-1 rounded bg-red-100 text-red-800">🇦🇹 Österreichischer Klassiker</span>');
      }

      if (meal.allergens && meal.allergens.length > 0) {
        if (meal.allergens.includes('gluten')) tagsHtml.push('<span class="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">🌾 Enthält Gluten</span>');
        if (meal.allergens.includes('lactose')) tagsHtml.push('<span class="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">🥛 Enthält Laktose</span>');
        if (meal.allergens.includes('egg')) tagsHtml.push('<span class="px-2 py-1 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">🥚 Enthält Ei</span>');
        if (meal.allergens.includes('fish')) tagsHtml.push('<span class="px-2 py-1 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">🐟 Enthält Fisch</span>');
        if (meal.allergens.includes('nuts')) tagsHtml.push('<span class="px-2 py-1 rounded bg-orange-50 text-orange-800 border border-orange-200">🥜 Enthält Nüsse</span>');
      } else {
        tagsHtml.push('<span class="font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">✅ Frei von den 5 Hauptallergenen</span>');
      }

      modalAllergensEl.innerHTML = tagsHtml.join('');
    }

    const list = document.getElementById('modal-meal-ingredients');
    list.innerHTML = meal.ingredients.map(ing => `
      <li class="py-2 flex items-center justify-between">
        <span class="font-medium text-slate-800">${ing.name}</span>
        <span class="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">
          ${ing.amount > 0 ? ing.amount : ''} ${ing.unit}
        </span>
      </li>
    `).join('');

    const modal = document.getElementById('recipe-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons();
  } catch (err) {
    console.error(err);
    showToast('Rezept konnte nicht geladen werden.');
  }
}

// --- Printable A4 1-Page Week Plan Overview ---

function printA4WeekPlan() {
  if (!state.plan || !state.plan.weeks || state.plan.weeks.length === 0) {
    showToast('Bitte zuerst einen Kalenderplan erstellen.');
    return;
  }

  const currentWeek = state.plan.weeks[state.activeWeekIndex] || state.plan.weeks[0];

  const titleEl = document.getElementById('print-plan-title');
  if (titleEl) {
    titleEl.innerText = `Mahlzeit Österreich – Kalender ${currentWeek.label}`;
  }

  const servingsEl = document.getElementById('print-plan-servings');
  if (servingsEl) servingsEl.innerText = `Portionen: ${state.servings} Personen`;

  const dateEl = document.getElementById('print-plan-date');
  if (dateEl) {
    const today = new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    dateEl.innerText = `Stand: ${today}`;
  }

  const allMeals = [];
  currentWeek.days.forEach(d => {
    if (d.lunch) allMeals.push(d.lunch);
    if (d.dinner) allMeals.push(d.dinner);
  });

  if (allMeals.length > 0) {
    const avgCal = Math.round(allMeals.reduce((a, b) => a + (b.nutrition?.calories || 550), 0) / allMeals.length);
    const avgProt = Math.round(allMeals.reduce((a, b) => a + (b.nutrition?.protein || 25), 0) / allMeals.length);
    const avgCarbs = Math.round(allMeals.reduce((a, b) => a + (b.nutrition?.carbs || 55), 0) / allMeals.length);
    const avgFat = Math.round(allMeals.reduce((a, b) => a + (b.nutrition?.fat || 22), 0) / allMeals.length);
    const totalCal = allMeals.reduce((a, b) => a + (b.nutrition?.calories || 550), 0);

    const pCal = document.getElementById('print-avg-calories');
    const pProt = document.getElementById('print-avg-protein');
    const pCarbs = document.getElementById('print-avg-carbs');
    const pFat = document.getElementById('print-avg-fat');
    const pTotal = document.getElementById('print-total-calories');

    if (pCal) pCal.innerText = `${avgCal} kcal`;
    if (pProt) pProt.innerText = `${avgProt} g`;
    if (pCarbs) pCarbs.innerText = `${avgCarbs} g`;
    if (pFat) pFat.innerText = `${avgFat} g`;
    if (pTotal) pTotal.innerText = `${totalCal.toLocaleString('de-AT')} kcal`;
  }

  const tbody = document.getElementById('print-table-body');
  if (tbody) {
    tbody.innerHTML = currentWeek.days.map((day, idx) => {
      const meal = day.dinner || day.lunch;
      if (!meal) return '';
      const n = meal.nutrition || { calories: 550, protein: 25, carbs: 55, fat: 22 };
      const topIngredients = meal.ingredients.slice(0, 4).map(i => i.name).join(', ');

      return `
        <tr class="print-day-row">
          <td class="py-1 px-2 align-top">
            <span class="font-extrabold text-[11px] block text-slate-900">${day.dayName}</span>
            <span class="text-[9px] text-slate-500 font-medium">${day.formattedDate || `Tag ${idx + 1}`}</span>
          </td>
          <td class="py-1 px-2 align-top">
            <div class="font-bold text-[11px] text-slate-900 flex items-center gap-1">
              <span>${meal.emoji || '🍲'}</span>
              <span>${meal.name}</span>
            </div>
            <div class="text-[9px] text-slate-500 mt-0.5">
              <span>⏱️ ${meal.prepTimeMinutes} Min</span> • <span>${meal.category}</span>
            </div>
          </td>
          <td class="py-1 px-2 align-top text-[10px]">
            <span class="font-bold text-slate-900 block">${n.calories} kcal</span>
            <span class="text-[9px] text-slate-600 block">
              ${n.protein}g P • ${n.carbs}g KH • ${n.fat}g F
            </span>
          </td>
          <td class="py-1 px-2 align-top text-[9px] text-slate-600">
            ${topIngredients}
          </td>
          <td class="py-1 px-1.5 align-middle text-center">
            <div class="w-3.5 h-3.5 border border-slate-400 rounded-xs mx-auto"></div>
          </td>
        </tr>
      `;
    }).join('');
  }

  const freshList = document.getElementById('print-fresh-items');
  if (freshList && state.ingredients) {
    const produceOrDairy = state.ingredients
      .filter(i => i.category === 'Gemüse & Obst' || i.category === 'Milchprodukte & Eier' || i.category === 'Fleisch & Fisch')
      .slice(0, 8);

    freshList.innerHTML = produceOrDairy.map(it => `
      <li class="truncate flex items-center gap-1">
        <span class="w-2.5 h-2.5 border border-slate-400 rounded-2xs shrink-0 inline-block"></span>
        <span class="truncate">${it.name} (${it.totalAmount > 0 ? it.totalAmount + ' ' + it.unit : ''})</span>
      </li>
    `).join('');
  }

  window.print();
}

function closeRecipeModal() {
  const modal = document.getElementById('recipe-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  state.currentModalMealId = null;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeRecipeModal();
});

// Toast notification
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.innerText = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 2800);
}
