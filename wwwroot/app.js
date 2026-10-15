// Mahlzeit Österreich - Calendar SPA & Multi-Week Planner

const FAVORITES_STORAGE_KEY = 'austrian_meal_favorites';
const WHO_PROFILE_STORAGE_KEY = 'austrian_meal_who_profile';
const FAV_PRODUCTS_STORAGE_KEY = 'austrian_meal_fav_products';

// --- WHO Profile Storage & Calculator ---

function getDefaultUserProfile() {
  return {
    gender: 'male',
    age: 30,
    weight: 75,
    height: 178,
    pal: 1.6,
    goal: 'maintain'
  };
}

function loadUserProfile() {
  try {
    const raw = localStorage.getItem(WHO_PROFILE_STORAGE_KEY);
    if (raw) {
      return { ...getDefaultUserProfile(), ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading WHO profile from localStorage', e);
  }
  return getDefaultUserProfile();
}

function saveUserProfile(profile) {
  try {
    localStorage.setItem(WHO_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving WHO profile to localStorage', e);
  }
}

function calculateWhoTargets(profile = null) {
  const p = profile || state?.userProfile || getDefaultUserProfile();
  const weight = parseFloat(p.weight) || 75;
  const height = parseFloat(p.height) || 178;
  const age = parseFloat(p.age) || 30;
  const pal = parseFloat(p.pal) || 1.6;
  const gender = p.gender || 'male';
  const goal = p.goal || 'maintain';

  // Mifflin-St Jeor Formula for BMR
  let bmr;
  if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  }

  // TDEE with PAL (Physical Activity Level)
  let tdee = bmr * pal;

  // Goal adjustment
  if (goal === 'lose') {
    tdee -= 350;
  } else if (goal === 'gain') {
    tdee += 300;
  }

  const kcal = Math.round(tdee);

  // WHO / D-A-CH recommendations:
  // Protein: ~1.15g per kg body weight (approx 15-20% kcal)
  const protein = Math.round(weight * 1.15);
  // Fat: 28% of total calories (9 kcal/g)
  const fat = Math.round((kcal * 0.28) / 9);
  // Carbs: remaining energy (~50-55% of kcal, 4 kcal/g)
  const carbs = Math.max(50, Math.round((kcal - (protein * 4) - (fat * 9)) / 4));

  return { kcal, protein, carbs, fat };
}

function updateWhoSummaryBar() {
  const targetEl = document.getElementById('who-summary-target');
  if (!targetEl) return;
  const target = calculateWhoTargets();
  targetEl.innerText = `${target.kcal.toLocaleString('de-AT')} kcal • ${target.protein}g P • ${target.carbs}g KH • ${target.fat}g F`;
}

function openWhoProfileModal() {
  const modal = document.getElementById('who-profile-modal');
  if (!modal) return;

  const p = state.userProfile || getDefaultUserProfile();
  const genderEl = document.getElementById('who-input-gender');
  const ageEl = document.getElementById('who-input-age');
  const weightEl = document.getElementById('who-input-weight');
  const heightEl = document.getElementById('who-input-height');
  const palEl = document.getElementById('who-input-pal');
  const goalEl = document.getElementById('who-input-goal');

  if (genderEl) genderEl.value = p.gender || 'male';
  if (ageEl) ageEl.value = p.age || 30;
  if (weightEl) weightEl.value = p.weight || 75;
  if (heightEl) heightEl.value = p.height || 178;
  if (palEl) palEl.value = p.pal || 1.6;
  if (goalEl) goalEl.value = p.goal || 'maintain';

  calculateLiveWhoTargets();

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  lucide.createIcons();
}

function closeWhoProfileModal() {
  const modal = document.getElementById('who-profile-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function calculateLiveWhoTargets() {
  const tempProfile = {
    gender: document.getElementById('who-input-gender')?.value || 'male',
    age: parseFloat(document.getElementById('who-input-age')?.value) || 30,
    weight: parseFloat(document.getElementById('who-input-weight')?.value) || 75,
    height: parseFloat(document.getElementById('who-input-height')?.value) || 178,
    pal: parseFloat(document.getElementById('who-input-pal')?.value) || 1.6,
    goal: document.getElementById('who-input-goal')?.value || 'maintain'
  };

  const target = calculateWhoTargets(tempProfile);

  const elKcal = document.getElementById('who-live-kcal');
  const elProt = document.getElementById('who-live-protein');
  const elCarbs = document.getElementById('who-live-carbs');
  const elFat = document.getElementById('who-live-fat');

  if (elKcal) elKcal.innerText = target.kcal.toLocaleString('de-AT');
  if (elProt) elProt.innerText = `${target.protein}g`;
  if (elCarbs) elCarbs.innerText = `${target.carbs}g`;
  if (elFat) elFat.innerText = `${target.fat}g`;
}

function saveWhoProfile() {
  state.userProfile = {
    gender: document.getElementById('who-input-gender')?.value || 'male',
    age: parseFloat(document.getElementById('who-input-age')?.value) || 30,
    weight: parseFloat(document.getElementById('who-input-weight')?.value) || 75,
    height: parseFloat(document.getElementById('who-input-height')?.value) || 178,
    pal: parseFloat(document.getElementById('who-input-pal')?.value) || 1.6,
    goal: document.getElementById('who-input-goal')?.value || 'maintain'
  };

  saveUserProfile(state.userProfile);
  updateWhoSummaryBar();
  renderCurrentCalendarView();
  syncAllPreferencesToCloud(true);
  closeWhoProfileModal();
  showToast('WHO-Profil & Nährwertziele aktualisiert! 🎯');
}

// --- Supermarket Vendor Favorite Products ---

function loadFavoriteProducts() {
  try {
    const raw = localStorage.getItem(FAV_PRODUCTS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        state.favoriteProducts = new Set(arr);
      }
    }
  } catch (e) {
    console.error('Error loading favorite products from localStorage', e);
  }
}

function saveFavoriteProducts() {
  try {
    localStorage.setItem(FAV_PRODUCTS_STORAGE_KEY, JSON.stringify(Array.from(state.favoriteProducts)));
  } catch (e) {
    console.error('Error saving favorite products to localStorage', e);
  }
}

function getProductFavKey(store, productName) {
  return `${store}_${productName}`;
}

function toggleFavoriteProduct(store, productName, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const key = getProductFavKey(store, productName);
  if (state.favoriteProducts.has(key)) {
    state.favoriteProducts.delete(key);
    showToast(`Produkt bei ${store} aus Favoriten entfernt ⭐`);
  } else {
    state.favoriteProducts.add(key);
    showToast(`Produkt bei ${store} favorisiert! ⭐️`);
  }
  saveFavoriteProducts();
  syncAllPreferencesToCloud(true);
  renderScoutViews();
}

const AUTH_TOKEN_STORAGE_KEY = 'austrian_meal_auth_token';
const CURRENT_USER_STORAGE_KEY = 'austrian_meal_current_user';

const state = {
  plan: null,
  activeWeekIndex: 0,
  weeksCount: 1, // Default 1 week
  calendarViewMode: 'week', // 'week' or 'month'
  servings: 2,
  tagFilter: 'all',
  includeBreakfast: false,
  includeLunch: false,
  includeDinner: true,
  ingredientScope: 'activeWeek', // 'activeWeek' or 'allWeeks'
  ingredients: [],
  selectedCategory: 'all',
  scoutResult: null,
  scoutViewMode: 'split',
  checkedShoppingItems: new Set(),
  excludedAllergens: new Set(),
  favorites: new Set(),
  lockedMeals: new Map(), // key: `${wIdx}_${dIdx}_${slot}`, value: { weekIndex, dayIndex, mealType, mealId }
  favoriteProducts: new Set(), // Set of "STORE_ProductName"
  onlyFavoriteProducts: false,
  userProfile: loadUserProfile(),
  currentMonthDate: new Date(),
  currentModalMealId: null,
  currentUser: null,
  authToken: localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || null,
  googleClientId: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  loadFavorites();
  loadFavoriteProducts();
  updateFavoritesBadge();
  updateWhoSummaryBar();
  await initUserAuthentication();
  await rollEntirePlan();
});

// --- User Authentication (Google & Demo) ---

async function initUserAuthentication() {
  try {
    // 1. Fetch Google Client ID if configured on backend
    const cfgRes = await fetch('/api/auth/config');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      state.googleClientId = cfg.googleClientId || null;
    }

    // 2. If token exists, verify session and restore user
    if (state.authToken) {
      const meRes = await fetch('/api/auth/me', {
        headers: getAuthHeaders()
      });
      if (meRes.ok) {
        state.currentUser = await meRes.json();
        updateAuthHeaderUI();
        applyUserPreferencesFromCloud(state.currentUser.preferences);
      } else {
        // Token expired
        state.authToken = null;
        state.currentUser = null;
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        updateAuthHeaderUI();
      }
    } else {
      updateAuthHeaderUI();
    }

    // 3. Setup Google Identity Services if client ID is set
    setupGoogleIdentity();
  } catch (e) {
    console.error('Error during auth initialization:', e);
    updateAuthHeaderUI();
  }
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.authToken) {
    headers['Authorization'] = `Bearer ${state.authToken}`;
    headers['X-User-Token'] = state.authToken;
  }
  return headers;
}

function setupGoogleIdentity() {
  if (window.google?.accounts?.id && state.googleClientId) {
    window.google.accounts.id.initialize({
      client_id: state.googleClientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false
    });
  }
}

function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) return;
  loginWithGoogleCredential(response.credential);
}

async function loginWithGoogleCredential(credential) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    if (!res.ok) throw new Error('Google-Login fehlgeschlagen');
    const data = await res.json();
    handleSuccessfulLogin(data);
  } catch (err) {
    console.error(err);
    showToast('Fehler bei Google-Anmeldung.');
  }
}

async function loginWithGoogleDemo(email = 'thomas.simhofer@gmail.com', name = 'Thomas Simhofer') {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isDemo: true,
        demoEmail: email,
        demoName: name
      })
    });
    if (!res.ok) throw new Error('Demo-Login fehlgeschlagen');
    const data = await res.json();
    handleSuccessfulLogin(data);
  } catch (err) {
    console.error(err);
    showToast('Fehler beim Demo-Login.');
  }
}

function handleSuccessfulLogin(data) {
  state.authToken = data.token;
  state.currentUser = data.user;
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);

  updateAuthHeaderUI();
  closeLoginModal();

  // If user has existing preferences in cloud, merge or hydrate
  if (data.user && data.user.preferences) {
    if (state.favorites.size > 0 || state.favoriteProducts.size > 0) {
      syncAllPreferencesToCloud(true);
    } else {
      applyUserPreferencesFromCloud(data.user.preferences);
    }
  }

  showToast(`Angemeldet als ${data.user.name}! ☁️`);
}

function updateAuthHeaderUI() {
  const btnLogin = document.getElementById('btn-login-google');
  const btnUser = document.getElementById('btn-user-profile');
  const userAvatar = document.getElementById('header-user-avatar');
  const userName = document.getElementById('header-user-name');

  if (state.currentUser && state.authToken) {
    if (btnLogin) btnLogin.classList.add('hidden');
    if (btnUser) btnUser.classList.remove('hidden');
    if (userAvatar) {
      userAvatar.src = state.currentUser.pictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
    }
    if (userName) {
      userName.innerText = state.currentUser.name ? state.currentUser.name.split(' ')[0] : 'User';
    }
  } else {
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (btnUser) btnUser.classList.add('hidden');
  }
  lucide.createIcons();
}

function openLoginModal() {
  const modal = document.getElementById('google-login-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Try to render Google Identity button if available
  if (window.google?.accounts?.id && state.googleClientId) {
    const container = document.getElementById('g_id_signin');
    if (container && container.children.length === 0) {
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        locale: 'de'
      });
    }
  }

  lucide.createIcons();
}

function closeLoginModal() {
  const modal = document.getElementById('google-login-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function logoutUser() {
  try {
    if (state.authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders()
      });
    }
  } catch (e) {
    console.error('Error logging out', e);
  }

  state.authToken = null;
  state.currentUser = null;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);

  updateAuthHeaderUI();
  closeUserProfileModal();
  showToast('Erfolgreich abgemeldet. Einstellungen bleiben lokal erhalten.');
}

// --- User Profile & Statistics Modal ---

async function openUserProfileModal() {
  if (!state.currentUser || !state.authToken) {
    openLoginModal();
    return;
  }

  const modal = document.getElementById('user-profile-modal');
  if (!modal) return;

  // Refresh latest user data & stats from server
  try {
    const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
    if (res.ok) {
      state.currentUser = await res.json();
    }
  } catch (e) {
    console.error('Error refreshing user stats', e);
  }

  const u = state.currentUser;
  const stats = u.statistics || {};

  // Profile Header
  const avatarEl = document.getElementById('profile-user-avatar');
  const nameEl = document.getElementById('profile-user-name');
  const emailEl = document.getElementById('profile-user-email');

  if (avatarEl) avatarEl.src = u.pictureUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
  if (nameEl) nameEl.innerText = u.name || 'Thomas Simhofer';
  if (emailEl) emailEl.innerText = u.email || 'thomas.simhofer@gmail.com';

  // Stats Cards
  const plansEl = document.getElementById('stat-plans-count');
  const savedEl = document.getElementById('stat-saved-money');
  const cookedEl = document.getElementById('stat-cooked-count');
  const storeEl = document.getElementById('stat-fav-store');
  const lastActiveEl = document.getElementById('stats-last-active');

  if (plansEl) plansEl.innerText = stats.plansGeneratedCount || 0;
  if (savedEl) savedEl.innerText = `${(stats.estimatedMoneySaved || 0).toFixed(2)} €`;
  if (cookedEl) cookedEl.innerText = stats.mealsCookedCount || 0;
  if (storeEl) storeEl.innerText = stats.favoriteStore || 'SPAR';
  if (lastActiveEl) {
    const date = stats.lastActive ? new Date(stats.lastActive).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Heute';
    lastActiveEl.innerText = `Aktiv: ${date}`;
  }

  // Preferences summary
  const favCountEl = document.getElementById('profile-pref-fav-count');
  const favProductsEl = document.getElementById('profile-pref-fav-products-count');
  const whoSummaryEl = document.getElementById('profile-pref-who-summary');
  const slotsSummaryEl = document.getElementById('profile-pref-slots-summary');

  if (favCountEl) favCountEl.innerText = `${state.favorites.size} Gerichte`;
  if (favProductsEl) favProductsEl.innerText = `${state.favoriteProducts.size} Produkte`;
  if (whoSummaryEl) {
    const targets = calculateWhoTargets();
    whoSummaryEl.innerText = `${targets.kcal} kcal (${targets.protein}g P • ${targets.carbs}g KH)`;
  }
  if (slotsSummaryEl) {
    const slots = [];
    if (state.includeBreakfast) slots.push('Früh');
    if (state.includeLunch) slots.push('Mittag');
    if (state.includeDinner) slots.push('Abend');
    slotsSummaryEl.innerText = slots.join(', ') || 'Keine';
  }

  // Recent activity list
  const activityList = document.getElementById('profile-recent-activity');
  if (activityList) {
    const activities = stats.recentActivity || [];
    if (activities.length === 0) {
      activityList.innerHTML = '<div class="text-xs text-slate-400 italic py-2">Noch keine Aktivitäten aufgezeichnet.</div>';
    } else {
      activityList.innerHTML = activities.slice(0, 8).map(act => {
        let icon = 'info';
        let color = 'text-slate-500 bg-slate-100';
        if (act.type === 'plan') { icon = 'calendar'; color = 'text-red-600 bg-red-50'; }
        else if (act.type === 'cook') { icon = 'soup'; color = 'text-blue-600 bg-blue-50'; }
        else if (act.type === 'save') { icon = 'tag'; color = 'text-emerald-600 bg-emerald-50'; }
        else if (act.type === 'auth') { icon = 'user-check'; color = 'text-purple-600 bg-purple-50'; }

        const dateStr = act.timestamp ? new Date(act.timestamp).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '';

        return `
          <div class="p-2 rounded-lg bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-md ${color} flex items-center justify-center shrink-0">
                <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
              </span>
              <span class="font-medium text-slate-800">${act.description}</span>
            </div>
            <span class="text-[10px] text-slate-400 font-semibold shrink-0 ml-2">${dateStr}</span>
          </div>
        `;
      }).join('');
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  lucide.createIcons();
}

function closeUserProfileModal() {
  const modal = document.getElementById('user-profile-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function recordMealCookedAction() {
  if (!state.currentUser || !state.authToken) return;

  try {
    const res = await fetch('/api/user/statistics/record', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: 'meal_cooked',
        details: 'Leckere Mahlzeit gekocht & genossen 🍲'
      })
    });
    if (res.ok) {
      const data = await res.json();
      state.currentUser.statistics = data.statistics;
      const countEl = document.getElementById('stat-cooked-count');
      if (countEl) countEl.innerText = data.statistics.mealsCookedCount;
      showToast('Gericht als gekocht in deiner Statistik erfasst! 🍲');
      openUserProfileModal();
    }
  } catch (e) {
    console.error('Error recording meal cooked action', e);
  }
}

async function recordStatisticEvent(action, valueInt = 0, valueDecimal = 0, details = '') {
  if (!state.currentUser || !state.authToken) return;
  try {
    await fetch('/api/user/statistics/record', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, valueInt, valueDecimal, details })
    });
  } catch (e) {
    console.warn('Could not record statistic event', e);
  }
}

// --- Preferences Cloud Sync ---

function applyUserPreferencesFromCloud(prefs) {
  if (!prefs) return;

  if (Array.isArray(prefs.favoriteMealIds) && prefs.favoriteMealIds.length > 0) {
    prefs.favoriteMealIds.forEach(id => state.favorites.add(id));
    saveFavorites();
    updateFavoritesBadge();
  }

  if (Array.isArray(prefs.favoriteProducts) && prefs.favoriteProducts.length > 0) {
    prefs.favoriteProducts.forEach(fp => state.favoriteProducts.add(fp));
    saveFavoriteProducts();
  }

  if (prefs.whoProfile && prefs.whoProfile.weight) {
    state.userProfile = { ...state.userProfile, ...prefs.whoProfile };
    saveUserProfile(state.userProfile);
    updateWhoSummaryBar();
  }

  if (prefs.tagFilter) {
    state.tagFilter = prefs.tagFilter;
  }

  if (prefs.defaultServings) {
    state.servings = prefs.defaultServings;
    const servSelect = document.getElementById('servings-select');
    if (servSelect) servSelect.value = state.servings;
  }
}

async function syncAllPreferencesToCloud(silent = false) {
  if (!state.currentUser || !state.authToken) return;

  const payload = {
    tagFilter: state.tagFilter,
    defaultServings: state.servings,
    includeBreakfast: state.includeBreakfast,
    includeLunch: state.includeLunch,
    includeDinner: state.includeDinner,
    excludedAllergens: Array.from(state.excludedAllergens),
    favoriteMealIds: Array.from(state.favorites),
    favoriteProducts: Array.from(state.favoriteProducts),
    whoProfile: state.userProfile
  };

  try {
    const res = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      if (!silent) showToast('Präferenzen erfolgreich in der Cloud gesichert! ☁️');
    }
  } catch (e) {
    if (!silent) showToast('Fehler bei der Cloud-Synchronisierung.');
  }
}

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
  syncAllPreferencesToCloud(true);

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

function toggleAllergenDrawer() {
  const drawer = document.getElementById('allergen-drawer');
  if (drawer) {
    drawer.classList.toggle('hidden');
  }
}

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
  const countBadge = document.getElementById('allergen-count-badge');
  const activeCount = state.excludedAllergens.size;

  if (resetBtn) {
    if (activeCount > 0) {
      resetBtn.classList.remove('hidden');
    } else {
      resetBtn.classList.add('hidden');
    }
  }

  if (countBadge) {
    if (activeCount > 0) {
      countBadge.innerText = activeCount;
      countBadge.classList.remove('hidden');
    } else {
      countBadge.classList.add('hidden');
    }
  }

  document.querySelectorAll('.allergen-pill').forEach(btn => {
    const allergen = btn.getAttribute('data-allergen');
    if (state.excludedAllergens.has(allergen)) {
      btn.className = 'allergen-pill px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-400 transition cursor-pointer';
    } else {
      btn.className = 'allergen-pill px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent transition cursor-pointer';
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

function onToggleMealSlot(slot, checked) {
  if (slot === 'breakfast') state.includeBreakfast = checked;
  if (slot === 'lunch') state.includeLunch = checked;
  if (slot === 'dinner') state.includeDinner = checked;

  // Ensure at least one meal is selected
  if (!state.includeBreakfast && !state.includeLunch && !state.includeDinner) {
    state.includeDinner = true;
    const dinnerCb = document.getElementById('toggle-slot-dinner');
    if (dinnerCb) dinnerCb.checked = true;
    showToast('Mindestens eine Mahlzeit muss aktiv sein.');
  }

  rollEntirePlan();
}

// --- Meal Locking Support ---

function getLockKey(weekIndex, dayIndex, mealType) {
  return `${weekIndex}_${dayIndex}_${mealType}`;
}

function isMealLocked(weekIndex, dayIndex, mealType) {
  return state.lockedMeals.has(getLockKey(weekIndex, dayIndex, mealType));
}

function toggleLockMeal(weekIndex, dayIndex, mealType, mealId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const key = getLockKey(weekIndex, dayIndex, mealType);
  if (state.lockedMeals.has(key)) {
    state.lockedMeals.delete(key);
    showToast('Fixierung gelöst 🔓');
  } else {
    state.lockedMeals.set(key, { weekIndex, dayIndex, mealType, mealId });
    showToast('Gericht fixiert 🔒 (bleibt beim Neu-Planen erhalten)');
  }
  renderCurrentCalendarView();
}

function getLockedMealsArray() {
  return Array.from(state.lockedMeals.values());
}

function setCalendarViewMode(mode) {
  state.calendarViewMode = mode;
  const weekView = document.getElementById('calendar-week-view');
  const monthView = document.getElementById('calendar-month-view');
  const btnWeek = document.getElementById('view-mode-week');
  const btnMonth = document.getElementById('view-mode-month');
  const weekNav = document.getElementById('week-navigator-group');
  const horizonSel = document.getElementById('horizon-selector-group');

  if (mode === 'week') {
    if (weekView) weekView.classList.remove('hidden');
    if (monthView) monthView.classList.add('hidden');
    if (weekNav) weekNav.classList.remove('hidden');
    if (horizonSel) horizonSel.classList.remove('hidden');
    if (btnWeek) {
      btnWeek.className = 'px-2.5 py-1 rounded-md font-bold bg-white text-slate-900 shadow-2xs transition flex items-center gap-1 cursor-pointer';
    }
    if (btnMonth) {
      btnMonth.className = 'px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer';
    }
  } else {
    if (weekView) weekView.classList.add('hidden');
    if (monthView) monthView.classList.remove('hidden');
    if (weekNav) weekNav.classList.add('hidden');
    if (horizonSel) horizonSel.classList.add('hidden');
    if (btnMonth) {
      btnMonth.className = 'px-2.5 py-1 rounded-md font-bold bg-white text-slate-900 shadow-2xs transition flex items-center gap-1 cursor-pointer';
    }
    if (btnWeek) {
      btnWeek.className = 'px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer';
    }
  }

  renderCurrentCalendarView();
  lucide.createIcons();
}

function renderCurrentCalendarView() {
  if (state.calendarViewMode === 'week') {
    renderWeeklyCalendarGrid();
  } else {
    renderCurrentMonthCalendar();
  }
}

// --- Month Calendar View ---

function changeCurrentMonth(delta) {
  state.currentMonthDate = new Date(state.currentMonthDate.getFullYear(), state.currentMonthDate.getMonth() + delta, 1);
  renderCurrentMonthCalendar();
}

function goToCurrentMonth() {
  state.currentMonthDate = new Date();
  renderCurrentMonthCalendar();
}

function renderCurrentMonthCalendar() {
  const container = document.getElementById('month-days-grid');
  const titleEl = document.getElementById('month-view-title');
  if (!container) return;

  const year = state.currentMonthDate.getFullYear();
  const month = state.currentMonthDate.getMonth();

  if (titleEl) {
    const monthName = state.currentMonthDate.toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
    titleEl.innerText = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }

  // Days in month calculation
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  // Monday = 0, Sunday = 6
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  // Days from previous month to fill row
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Map existing plan days to a lookup: "DD.MM." -> { day, weekIndex, dayIndex }
  const planDayMap = new Map();
  if (state.plan && state.plan.weeks) {
    state.plan.weeks.forEach((w, wIdx) => {
      w.days.forEach((d, dIdx) => {
        if (d.formattedDate) {
          planDayMap.set(d.formattedDate.trim(), { day: d, weekIndex: wIdx, dayIndex: dIdx });
        }
      });
    });
  }

  const today = new Date();
  const isCurrentRealMonth = (today.getFullYear() === year && today.getMonth() === month);

  let html = '';

  // 1. Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    html += `
      <div class="min-h-[90px] sm:min-h-[110px] p-1.5 bg-slate-50/50 rounded-xl border border-slate-100 text-slate-300 flex flex-col justify-between opacity-50">
        <span class="text-xs font-bold">${dayNum}</span>
      </div>
    `;
  }

  // 2. Current month days
  for (let d = 1; d <= totalDays; d++) {
    const isToday = isCurrentRealMonth && (today.getDate() === d);
    const dayDateStr = `${String(d).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.`;
    const planInfo = planDayMap.get(dayDateStr);

    let contentHtml = '';
    let dayTotalKcal = 0;

    if (planInfo && planInfo.day) {
      const pDay = planInfo.day;
      const meals = [];
      if (pDay.breakfast) meals.push({ m: pDay.breakfast, type: 'breakfast', slot: 'Früh' });
      if (pDay.lunch) meals.push({ m: pDay.lunch, type: 'lunch', slot: 'Mittag' });
      if (pDay.dinner) meals.push({ m: pDay.dinner, type: 'dinner', slot: 'Abend' });

      dayTotalKcal = meals.reduce((sum, item) => sum + (item.m.nutrition?.calories || 500), 0);

      contentHtml = `
        <div class="space-y-1 my-1">
          ${meals.map(item => {
            const isLocked = isMealLocked(planInfo.weekIndex, planInfo.dayIndex, item.type);
            return `
              <div onclick="openRecipeModal('${item.m.id}')" title="${item.slot}: ${item.m.name} (${item.m.nutrition?.calories || 500} kcal)" class="px-1 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200/90 hover:border-red-400 hover:text-red-700 shadow-2xs truncate flex items-center justify-between cursor-pointer transition">
                <span class="truncate flex items-center gap-0.5">
                  <span>${item.m.emoji || '🍲'}</span>
                  <span class="truncate">${item.m.name}</span>
                </span>
                ${isLocked ? '<span class="text-[9px] text-amber-500 shrink-0 ml-0.5">🔒</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    html += `
      <div class="min-h-[90px] sm:min-h-[110px] p-1.5 rounded-xl border ${isToday ? 'border-red-500 bg-red-50/20 ring-1 ring-red-400 shadow-xs' : 'border-slate-200/80 bg-white hover:border-slate-300'} flex flex-col justify-between transition group">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-black ${isToday ? 'bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-800'}">${d}</span>
            ${dayTotalKcal > 0 ? `<span class="text-[9px] font-bold text-slate-400">🔥 ${dayTotalKcal}</span>` : ''}
          </div>
          ${contentHtml}
        </div>
        ${planInfo ? `
          <button onclick="setActiveWeekDirectly(${planInfo.weekIndex})" class="w-full text-center py-0.5 text-[9px] font-bold text-red-600 hover:bg-red-50 rounded transition mt-1">
            Woche ${planInfo.weekIndex + 1} anzeigen →
          </button>
        ` : `
          <div class="text-[9px] text-slate-300 italic text-center py-0.5">Kein Plan</div>
        `}
      </div>
    `;
  }

  // 3. Next month leading days to complete grid
  const remainingCells = (7 - ((startDayOfWeek + totalDays) % 7)) % 7;
  for (let j = 1; j <= remainingCells; j++) {
    html += `
      <div class="min-h-[90px] sm:min-h-[110px] p-1.5 bg-slate-50/50 rounded-xl border border-slate-100 text-slate-300 flex flex-col justify-between opacity-50">
        <span class="text-xs font-bold">${j}</span>
      </div>
    `;
  }

  container.innerHTML = html;
  lucide.createIcons();
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
      includeBreakfast: state.includeBreakfast,
      includeLunch: state.includeLunch,
      includeDinner: state.includeDinner,
      weeksCount: state.weeksCount,
      excludedAllergens: Array.from(state.excludedAllergens),
      favoriteMealIds: Array.from(state.favorites),
      lockedMeals: getLockedMealsArray()
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

    const lockedCount = state.lockedMeals.size;
    const lockedMsg = lockedCount > 0 ? ` (${lockedCount} 🔒 fixiert)` : '';
    const weekText = state.weeksCount === 1 ? '1 Woche' : `${state.weeksCount} Wochen`;
    showToast(`Speiseplan für ${weekText} vorhergesagt! 📅${lockedMsg}`);

    // Auto-record plan generation in user stats if logged in
    let totalPlannedKcal = 0;
    if (state.plan && state.plan.weeks) {
      state.plan.weeks.forEach(w => {
        w.days.forEach(d => {
          if (d.breakfast) totalPlannedKcal += (d.breakfast.nutrition?.calories || 500);
          if (d.lunch) totalPlannedKcal += (d.lunch.nutrition?.calories || 500);
          if (d.dinner) totalPlannedKcal += (d.dinner.nutrition?.calories || 500);
        });
      });
    }
    recordStatisticEvent('plan_generated', totalPlannedKcal, 0, `Plan für ${weekText} generiert (${state.servings} Pers.)`);
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

    if (isMealLocked(wIdx, dayIndex, mealType)) {
      showToast('Dieses Gericht ist fixiert 🔒. Bitte zuerst entsperren.');
      return;
    }

    const currentMealIds = [];
    currentWeek.days.forEach(d => {
      if (d.breakfast) currentMealIds.push(d.breakfast.id);
      if (d.lunch) currentMealIds.push(d.lunch.id);
      if (d.dinner) currentMealIds.push(d.dinner.id);
    });

    const payload = {
      tagFilter: state.tagFilter,
      currentMealIds,
      excludedAllergens: Array.from(state.excludedAllergens),
      favoriteMealIds: Array.from(state.favorites),
      isBreakfast: (mealType === 'breakfast')
    };

    const res = await fetch('/api/plan/reroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Fehler beim Neu-Würfeln');
    const newMeal = await res.json();

    if (mealType === 'breakfast') {
      currentWeek.days[dayIndex].breakfast = newMeal;
    } else if (mealType === 'lunch') {
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

  // Update Nutrition Summary Banner & WHO Banner
  updateNutritionBanner(currentWeek);
  updateWhoSummaryBar();

  const whoTarget = calculateWhoTargets();

  container.innerHTML = currentWeek.days.map((day, idx) => {
    // Calculate total daily macros across all active meal slots
    const dayMeals = [];
    if (day.breakfast) dayMeals.push(day.breakfast);
    if (day.lunch) dayMeals.push(day.lunch);
    if (day.dinner) dayMeals.push(day.dinner);

    const dayTotalCalories = dayMeals.reduce((acc, m) => acc + (m.nutrition?.calories || 500), 0);
    const dayTotalProtein = dayMeals.reduce((acc, m) => acc + (m.nutrition?.protein || 25), 0);
    const dayTotalCarbs = dayMeals.reduce((acc, m) => acc + (m.nutrition?.carbs || 50), 0);
    const dayTotalFat = dayMeals.reduce((acc, m) => acc + (m.nutrition?.fat || 20), 0);

    const whoPercent = whoTarget.kcal > 0 ? Math.round((dayTotalCalories / whoTarget.kcal) * 100) : 100;
    const isTargetMet = whoPercent >= 80 && whoPercent <= 110;
    const progressColor = isTargetMet ? 'bg-emerald-500' : (whoPercent < 80 ? 'bg-amber-400' : 'bg-red-500');

    return `
      <div class="calendar-day-col bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden ${day.isToday ? 'ring-2 ring-red-500 shadow-xs' : ''}">
        <!-- Day Column Header -->
        <div class="px-2.5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="font-black text-xs text-slate-900 leading-none">${day.dayName.slice(0, 2)}</span>
            <span class="text-[11px] font-semibold text-slate-500 leading-none">${day.formattedDate || `Tag ${idx + 1}`}</span>
          </div>
          ${day.isToday ? `
            <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-600 text-white shadow-2xs">Heute</span>
          ` : `
            <span class="text-[10px] font-bold text-slate-300">#${idx + 1}</span>
          `}
        </div>

        <!-- Meals in Day (Breakfast, Lunch, Dinner) -->
        <div class="p-1.5 space-y-1.5 flex-grow">
          ${day.breakfast ? renderCalendarMealCard(day.breakfast, idx, 'breakfast', 'Frühstück', state.activeWeekIndex) : ''}
          ${day.lunch ? renderCalendarMealCard(day.lunch, idx, 'lunch', 'Mittag', state.activeWeekIndex) : ''}
          ${day.dinner ? renderCalendarMealCard(day.dinner, idx, 'dinner', 'Abend', state.activeWeekIndex) : ''}
          ${dayMeals.length === 0 ? '<div class="p-4 text-center text-xs text-slate-400 italic">Keine Mahlzeit aktiv</div>' : ''}
        </div>

        <!-- Day Footer Summary with WHO Target Comparison -->
        <div class="px-2 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-600 font-semibold flex flex-col gap-1">
          <div class="flex items-center justify-between font-bold text-slate-800">
            <span title="Tageskalorien">🔥 ${dayTotalCalories} kcal</span>
            <span title="Tageseiweiß" class="text-blue-700">${dayTotalProtein}g P</span>
          </div>
          <div class="flex items-center justify-between text-[9px] text-slate-400 font-medium">
            <span title="Kohlenhydrate">${dayTotalCarbs}g KH</span>
            <span title="Fett">${dayTotalFat}g F</span>
          </div>

          <!-- WHO Daily Target Progress Bar -->
          <div class="pt-1 border-t border-slate-200/70 cursor-pointer" onclick="openWhoProfileModal()" title="Klicken, um WHO-Profil anzupassen">
            <div class="flex items-center justify-between text-[8.5px] mb-0.5">
              <span class="font-extrabold text-blue-800 flex items-center gap-0.5">
                <span>🎯 WHO:</span>
                <span>${whoPercent}%</span>
              </span>
              <span class="text-slate-400">Ziel: ${whoTarget.kcal} kcal</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
              <div class="${progressColor} h-1 rounded-full transition-all" style="width: ${Math.min(100, whoPercent)}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function renderCalendarMealCard(meal, dayIndex, type, titleLabel, weekIndex) {
  const n = meal.nutrition || { calories: 550, protein: 25, carbs: 55, fat: 22, fiber: 5, portionWeightGrams: 380 };
  const isFav = state.favorites.has(meal.id);
  const isLocked = isMealLocked(weekIndex, dayIndex, type);

  // Calculate per 100g values
  const portionWeight = n.portionWeightGrams || 380;
  const cal100 = n.caloriesPer100g || Math.round((n.calories * 100) / portionWeight);
  const prot100 = n.proteinPer100g !== undefined ? n.proteinPer100g : (Math.round(((n.protein * 100) / portionWeight) * 10) / 10);
  const carbs100 = n.carbsPer100g !== undefined ? n.carbsPer100g : (Math.round(((n.carbs * 100) / portionWeight) * 10) / 10);
  const fat100 = n.fatPer100g !== undefined ? n.fatPer100g : (Math.round(((n.fat * 100) / portionWeight) * 10) / 10);

  // Subtle Diet badge
  let dietBadge = '';
  if (meal.tags.includes('vegan')) {
    dietBadge = '<span class="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">🌿 Vegan</span>';
  } else if (meal.tags.includes('vegetarian')) {
    dietBadge = '<span class="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-green-50 text-green-700 border border-green-200/60">🌱 Veggie</span>';
  }

  return `
    <div class="calendar-meal-card bg-slate-50/70 hover:bg-white p-2.5 rounded-xl border ${isLocked ? 'border-amber-400 ring-1 ring-amber-300/80 bg-amber-50/30' : 'border-slate-200/90'} hover:border-slate-300 hover:shadow-xs transition relative group flex flex-col justify-between">
      <div>
        <!-- Slot Header & Action Buttons (Lock, Favorite, Reroll) -->
        <div class="flex items-center justify-between gap-1 mb-1.5">
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-black text-red-700 uppercase tracking-wider">${titleLabel}</span>
            ${dietBadge}
          </div>
          <div class="flex items-center gap-0.5">
            <!-- Lock / Pin button -->
            <button onclick="toggleLockMeal(${weekIndex}, ${dayIndex}, '${type}', '${meal.id}', event)" title="${isLocked ? 'Fixierung aufheben (Gericht wird bei Neu-Planung wieder verändert)' : 'Gericht fixieren 🔒 (bleibt bei Neu-Planung erhalten)'}" class="p-0.5 rounded transition cursor-pointer ${isLocked ? 'text-amber-500 font-black' : 'text-slate-300 hover:text-amber-500'}">
              <span class="text-xs select-none leading-none">${isLocked ? '🔒' : '🔓'}</span>
            </button>
            <!-- Favorite toggle -->
            <button onclick="toggleFavorite('${meal.id}', event)" title="Favorit umschalten" class="fav-btn-${meal.id} ${isFav ? 'text-red-500' : 'text-slate-300'} hover:text-red-500 p-0.5 rounded transition cursor-pointer">
              <span class="fav-icon text-xs select-none leading-none">${isFav ? '❤️' : '🤍'}</span>
            </button>
            <!-- Reroll button -->
            <button onclick="rerollSingleMeal(${dayIndex}, '${type}', ${weekIndex})" title="${isLocked ? 'Gericht ist fixiert' : 'Gericht neu würfeln'}" ${isLocked ? 'disabled' : ''} class="${isLocked ? 'opacity-30 cursor-not-allowed' : 'text-slate-300 hover:text-red-600 cursor-pointer'} p-0.5 rounded transition">
              <i data-lucide="refresh-cw" class="w-3 h-3"></i>
            </button>
          </div>
        </div>

        <!-- Meal Title & Emoji (Click to open recipe) -->
        <div class="flex items-start gap-1.5 cursor-pointer group-hover:text-red-600 transition" onclick="openRecipeModal('${meal.id}')" title="Rezept ansehen">
          <span class="text-lg select-none shrink-0 leading-tight">${meal.emoji || '🍲'}</span>
          <div class="min-w-0">
            <h4 class="font-bold text-slate-900 text-xs leading-snug line-clamp-2">${meal.name}</h4>
            <span class="text-[10px] text-slate-400 font-medium">⏱️ ${meal.prepTimeMinutes} Min.</span>
          </div>
        </div>
      </div>

      <!-- Macro Nutrients Grid: Portion AND Per 100g (Both displayed cleanly!) -->
      <div class="mt-2 pt-1.5 border-t border-slate-200/70">
        <div class="bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden text-center">
          <div class="grid grid-cols-4 bg-slate-50/90 py-0.5 border-b border-slate-100 text-[8px] font-black uppercase text-slate-400">
            <span>Kcal</span>
            <span class="text-blue-500">Protein</span>
            <span class="text-emerald-500">Carbs</span>
            <span class="text-amber-500">Fett</span>
          </div>
          <!-- Row 1: Pro Portion -->
          <div class="grid grid-cols-4 py-1 border-b border-slate-100 font-black text-slate-800 text-[11px] leading-tight">
            <div>${n.calories} <span class="block text-[7.5px] font-semibold text-slate-400">Port.</span></div>
            <div class="border-l border-slate-100 text-blue-700">${n.protein}g <span class="block text-[7.5px] font-semibold text-slate-400">Port.</span></div>
            <div class="border-l border-slate-100 text-emerald-700">${n.carbs}g <span class="block text-[7.5px] font-semibold text-slate-400">Port.</span></div>
            <div class="border-l border-slate-100 text-amber-700">${n.fat}g <span class="block text-[7.5px] font-semibold text-slate-400">Port.</span></div>
          </div>
          <!-- Row 2: Pro 100g -->
          <div class="grid grid-cols-4 py-0.5 bg-slate-50/50 text-[9px] font-bold text-slate-500 leading-tight">
            <div>${cal100} <span class="text-[7.5px] font-normal text-slate-400">/100g</span></div>
            <div class="border-l border-slate-100">${prot100}g <span class="text-[7.5px] font-normal text-slate-400">/100g</span></div>
            <div class="border-l border-slate-100">${carbs100}g <span class="text-[7.5px] font-normal text-slate-400">/100g</span></div>
            <div class="border-l border-slate-100">${fat100}g <span class="text-[7.5px] font-normal text-slate-400">/100g</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMultiWeekOverview() {
  const container = document.getElementById('calendar-multi-view');
  if (!container || !state.plan || !state.plan.weeks) return;

  container.innerHTML = state.plan.weeks.map((week, wIdx) => {
    return `
      <div class="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden w-full">
        <!-- Week Header -->
        <div class="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-black text-slate-900">${week.label}</span>
            <span class="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-100 text-red-800">
              Woche ${wIdx + 1}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-semibold">
              Ø ${week.nutritionSummary?.averageCalories || 550} kcal / Mahlzeit
            </span>
            <button onclick="setActiveWeekDirectly(${wIdx})" class="text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer">
              <span>Woche im 7-Tage-Kalender</span>
              <i data-lucide="arrow-right" class="w-3 h-3"></i>
            </button>
          </div>
        </div>

        <!-- 7 Days in Week Row -->
        <div class="p-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          ${week.days.map((day, dIdx) => {
            const mainMeal = day.dinner || day.lunch;
            return `
              <div class="p-2 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-white hover:shadow-2xs transition text-xs">
                <div class="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>${day.dayName.slice(0, 2)} ${day.formattedDate || ''}</span>
                  ${day.isToday ? '<span class="text-[8px] bg-red-600 text-white px-1 py-0.2 rounded font-black">Heute</span>' : ''}
                </div>
                ${mainMeal ? `
                  <div class="flex items-start gap-1">
                    <span class="text-sm leading-none">${mainMeal.emoji || '🍲'}</span>
                    <div class="min-w-0">
                      <p class="font-bold text-[11px] text-slate-900 leading-tight truncate" title="${mainMeal.name}">${mainMeal.name}</p>
                      <span class="text-[10px] text-slate-500">${mainMeal.nutrition?.calories || 550} kcal • ${mainMeal.nutrition?.protein || 25}g P</span>
                    </div>
                  </div>
                ` : '<span class="text-slate-400 text-[10px]">Keine Mahlzeit</span>'}
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
          if (d.breakfast) mealIds.push(d.breakfast.id);
          if (d.lunch) mealIds.push(d.lunch.id);
          if (d.dinner) mealIds.push(d.dinner.id);
        });
      });
    } else {
      const activeWeek = state.plan.weeks[state.activeWeekIndex] || state.plan.weeks[0];
      if (activeWeek) {
        activeWeek.days.forEach(d => {
          if (d.breakfast) mealIds.push(d.breakfast.id);
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

    if (state.scoutResult && state.scoutResult.potentialSavings > 0) {
      recordStatisticEvent('money_saved', 0, state.scoutResult.potentialSavings, state.scoutResult.bestSingleStore);
    }

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
            const favKey = getProductFavKey(store.key, item.name);
            const isProductFav = state.favoriteProducts.has(favKey);

            return `
              <div class="shopping-item p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition ${isChecked ? 'checked' : ''}">
                <div class="flex items-start sm:items-center gap-3.5 flex-grow">
                  <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleShoppingItem('${itemKey}')" class="mt-1 sm:mt-0 w-5 h-5 rounded text-red-600 focus:ring-red-500 cursor-pointer">

                  <!-- Vendor Product Favorite Star -->
                  <button onclick="toggleFavoriteProduct('${store.key}', '${item.name.replace(/'/g, "\\'")}', event)" title="${isProductFav ? 'Lieblingsprodukt bei ' + store.name + ' (Klicken zum Entfernen)' : 'Als Lieblingsprodukt bei ' + store.name + ' markieren'}" class="p-1 rounded text-base cursor-pointer transition shrink-0 ${isProductFav ? 'text-amber-500 scale-110' : 'text-slate-300 hover:text-amber-500'}">
                    <span>${isProductFav ? '⭐️' : '☆'}</span>
                  </button>

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

    const sparFav = spar ? state.favoriteProducts.has(getProductFavKey('SPAR', item.name)) : false;
    const billaFav = billa ? state.favoriteProducts.has(getProductFavKey('BILLA', item.name)) : false;
    const hoferFav = hofer ? state.favoriteProducts.has(getProductFavKey('HOFER', item.name)) : false;

    return `
      <tr class="hover:bg-slate-50 transition">
        <td class="py-3 px-4 font-bold text-slate-900 text-xs">${item.name}</td>
        <td class="py-3 px-4 text-xs font-semibold text-slate-600">${item.amount > 0 ? item.amount : ''} ${item.unit}</td>
        <td class="py-3 px-4 text-xs ${spar && spar.isCheapest ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-600'}">
          ${spar ? `
            <div class="flex items-center justify-between gap-1">
              <div>
                <div>${spar.price.toFixed(2)} €</div>
                <span class="text-[10px] text-slate-400 block">${spar.brand}</span>
              </div>
              <button onclick="toggleFavoriteProduct('SPAR', '${item.name.replace(/'/g, "\\'")}', event)" title="SPAR Lieblingsprodukt umschalten" class="text-xs cursor-pointer ${sparFav ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}">
                ${sparFav ? '⭐' : '☆'}
              </button>
            </div>
          ` : '—'}
        </td>
        <td class="py-3 px-4 text-xs ${billa && billa.isCheapest ? 'font-bold text-yellow-700 bg-yellow-50/50' : 'text-slate-600'}">
          ${billa ? `
            <div class="flex items-center justify-between gap-1">
              <div>
                <div>${billa.price.toFixed(2)} €</div>
                <span class="text-[10px] text-slate-400 block">${billa.brand}</span>
              </div>
              <button onclick="toggleFavoriteProduct('BILLA', '${item.name.replace(/'/g, "\\'")}', event)" title="BILLA Lieblingsprodukt umschalten" class="text-xs cursor-pointer ${billaFav ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}">
                ${billaFav ? '⭐' : '☆'}
              </button>
            </div>
          ` : '—'}
        </td>
        <td class="py-3 px-4 text-xs ${hofer && hofer.isCheapest ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-slate-600'}">
          ${hofer ? `
            <div class="flex items-center justify-between gap-1">
              <div>
                <div>${hofer.price.toFixed(2)} €</div>
                <span class="text-[10px] text-slate-400 block">${hofer.brand}</span>
              </div>
              <button onclick="toggleFavoriteProduct('HOFER', '${item.name.replace(/'/g, "\\'")}', event)" title="HOFER Lieblingsprodukt umschalten" class="text-xs cursor-pointer ${hoferFav ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}">
                ${hoferFav ? '⭐' : '☆'}
              </button>
            </div>
          ` : '—'}
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

    const n = meal.nutrition || { calories: 550, protein: 25, carbs: 55, fat: 22, fiber: 5, portionWeightGrams: 380 };
    const portionWeight = n.portionWeightGrams || 380;
    const cal100 = n.caloriesPer100g || Math.round((n.calories * 100) / portionWeight);
    const prot100 = n.proteinPer100g !== undefined ? n.proteinPer100g : (Math.round(((n.protein * 100) / portionWeight) * 10) / 10);
    const carbs100 = n.carbsPer100g !== undefined ? n.carbsPer100g : (Math.round(((n.carbs * 100) / portionWeight) * 10) / 10);
    const fat100 = n.fatPer100g !== undefined ? n.fatPer100g : (Math.round(((n.fat * 100) / portionWeight) * 10) / 10);

    const elPortionWeight = document.getElementById('modal-portion-weight');
    if (elPortionWeight) elPortionWeight.innerText = `Portion: ~${portionWeight}g`;

    // Row 1: Pro Portion
    const elCal = document.getElementById('modal-nutri-calories');
    const elProt = document.getElementById('modal-nutri-protein');
    const elCarbs = document.getElementById('modal-nutri-carbs');
    const elFat = document.getElementById('modal-nutri-fat');
    if (elCal) elCal.innerText = `${n.calories} kcal`;
    if (elProt) elProt.innerText = `${n.protein} g`;
    if (elCarbs) elCarbs.innerText = `${n.carbs} g`;
    if (elFat) elFat.innerText = `${n.fat} g`;

    // Row 2: Pro 100g
    const elCal100 = document.getElementById('modal-nutri-calories-100g');
    const elProt100 = document.getElementById('modal-nutri-protein-100g');
    const elCarbs100 = document.getElementById('modal-nutri-carbs-100g');
    const elFat100 = document.getElementById('modal-nutri-fat-100g');
    if (elCal100) elCal100.innerText = `${cal100} kcal`;
    if (elProt100) elProt100.innerText = `${prot100} g`;
    if (elCarbs100) elCarbs100.innerText = `${carbs100} g`;
    if (elFat100) elFat100.innerText = `${fat100} g`;

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

// --- Add Custom Meal Modal ---

function openAddMealModal() {
  const modal = document.getElementById('add-meal-modal');
  if (!modal) return;

  const form = document.getElementById('form-add-meal');
  if (form) form.reset();

  const ingredientsList = document.getElementById('new-meal-ingredients-list');
  if (ingredientsList) {
    ingredientsList.innerHTML = '';
    addNewIngredientRow('Hauptzutat', 200, 'g');
    addNewIngredientRow('Nebenzutat', 1, 'Stk');
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  lucide.createIcons();
}

function closeAddMealModal() {
  const modal = document.getElementById('add-meal-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function addNewIngredientRow(name = '', amount = '', unit = 'g') {
  const container = document.getElementById('new-meal-ingredients-list');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'flex items-center gap-1.5 dynamic-ingredient-row';
  row.innerHTML = `
    <input type="text" placeholder="Zutat (z. B. Hühnerbrust)" value="${name}" required class="flex-grow bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold ing-name">
    <input type="number" placeholder="Menge" value="${amount}" min="0" step="any" class="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold ing-amount text-center">
    <select class="w-18 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold ing-unit">
      <option value="g" ${unit === 'g' ? 'selected' : ''}>g</option>
      <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
      <option value="ml" ${unit === 'ml' ? 'selected' : ''}>ml</option>
      <option value="l" ${unit === 'l' ? 'selected' : ''}>l</option>
      <option value="Stk" ${unit === 'Stk' ? 'selected' : ''}>Stk</option>
      <option value="EL" ${unit === 'EL' ? 'selected' : ''}>EL</option>
      <option value="TL" ${unit === 'TL' ? 'selected' : ''}>TL</option>
      <option value="Bund" ${unit === 'Bund' ? 'selected' : ''}>Bund</option>
      <option value="Prise" ${unit === 'Prise' ? 'selected' : ''}>Prise</option>
    </select>
    <button type="button" onclick="this.parentElement.remove()" class="p-1 text-slate-300 hover:text-red-500 rounded cursor-pointer">
      <i data-lucide="x" class="w-3.5 h-3.5"></i>
    </button>
  `;
  container.appendChild(row);
  lucide.createIcons();
}

async function submitNewMeal(event) {
  if (event) event.preventDefault();

  const name = document.getElementById('new-meal-name')?.value.trim();
  if (!name) {
    showToast('Bitte einen Namen für das Gericht eingeben.');
    return;
  }

  const emoji = document.getElementById('new-meal-emoji')?.value.trim() || '🍲';
  const slot = document.getElementById('new-meal-slot')?.value || 'dinner';
  const prepTimeMinutes = parseInt(document.getElementById('new-meal-time')?.value, 10) || 25;
  const portionWeightGrams = parseInt(document.getElementById('new-meal-weight')?.value, 10) || 380;
  const diet = document.getElementById('new-meal-diet')?.value || 'classic';

  // Allergens
  const allergens = [];
  document.querySelectorAll('.new-meal-allergen:checked').forEach(cb => {
    allergens.push(cb.value);
  });

  // Macros per portion
  const calories = parseInt(document.getElementById('new-meal-cal')?.value, 10) || 520;
  const protein = parseInt(document.getElementById('new-meal-prot')?.value, 10) || 28;
  const carbs = parseInt(document.getElementById('new-meal-carbs')?.value, 10) || 56;
  const fat = parseInt(document.getElementById('new-meal-fat')?.value, 10) || 20;

  // Ingredients
  const ingredients = [];
  document.querySelectorAll('.dynamic-ingredient-row').forEach(row => {
    const ingName = row.querySelector('.ing-name')?.value.trim();
    const ingAmount = parseFloat(row.querySelector('.ing-amount')?.value) || 0;
    const ingUnit = row.querySelector('.ing-unit')?.value || 'g';

    if (ingName) {
      ingredients.push({
        name: ingName,
        searchTerm: ingName,
        amount: ingAmount,
        unit: ingUnit,
        category: 'Sonstiges',
        isPantryStaple: false
      });
    }
  });

  if (ingredients.length === 0) {
    ingredients.push({
      name: name,
      searchTerm: name,
      amount: 1,
      unit: 'Port.',
      category: 'Sonstiges',
      isPantryStaple: false
    });
  }

  // Tags
  const tags = ['custom'];
  if (diet === 'vegetarian') tags.push('vegetarian');
  if (diet === 'vegan') {
    tags.push('vegan');
    tags.push('vegetarian');
  }
  if (diet === 'fish') tags.push('fish');
  if (slot === 'breakfast') tags.push('breakfast');
  if (slot === 'lunch') tags.push('lunch');
  if (slot === 'dinner') tags.push('dinner');

  const newMealId = `custom-${Date.now()}`;

  const payload = {
    id: newMealId,
    name,
    emoji,
    category: slot === 'breakfast' ? 'Frühstück' : (diet === 'vegetarian' || diet === 'vegan' ? 'Vegetarisch' : 'Hauptspeise'),
    prepTimeMinutes,
    difficulty: 'Einfach',
    description: `Hausgemachtes Rezept für ${name}.`,
    nutrition: {
      calories,
      protein,
      carbs,
      fat,
      fiber: 4,
      portionWeightGrams
    },
    tags,
    allergens,
    ingredients
  };

  try {
    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Fehler beim Speichern des Rezepts');

    state.favorites.add(newMealId);
    saveFavorites();
    updateFavoritesBadge();
    syncAllPreferencesToCloud(true);

    closeAddMealModal();
    showToast(`Rezept "${name}" gespeichert & zu Favoriten hinzugefügt! 🎉`);

    await rollEntirePlan();
  } catch (err) {
    console.error(err);
    showToast('Rezept konnte nicht gespeichert werden.');
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
    if (d.breakfast) allMeals.push(d.breakfast);
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
      const meal = day.dinner || day.lunch || day.breakfast;
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
