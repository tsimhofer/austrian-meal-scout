using System.Globalization;
using AustrianMealScout.Models;

namespace AustrianMealScout.Services;

public class MealPlannerService
{
    private readonly MealDatabase _mealDatabase;
    private readonly Random _random = new();

    public MealPlannerService(MealDatabase mealDatabase)
    {
        _mealDatabase = mealDatabase;
    }

    private static readonly string[] DayNames =
    {
        "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"
    };

    public MultiWeekPlan GenerateMultiWeekPlan(
        string? tagFilter = "all",
        int servings = 2,
        bool includeBreakfast = false,
        bool includeLunch = false,
        bool includeDinner = true,
        int weeksCount = 1,
        string? startDateStr = null,
        List<string>? excludedAllergens = null,
        List<string>? favoriteMealIds = null,
        List<LockedMealItem>? lockedMeals = null)
    {
        weeksCount = Math.Clamp(weeksCount, 1, 6);

        // Separate pools for breakfast and main meals (lunch/dinner)
        var breakfastMeals = _mealDatabase.GetFilteredMeals(
            diet: tagFilter,
            excludedAllergens: excludedAllergens,
            favoriteIds: favoriteMealIds,
            isBreakfast: true
        );
        if (breakfastMeals.Count == 0)
        {
            breakfastMeals = _mealDatabase.GetFilteredMeals(isBreakfast: true);
            if (breakfastMeals.Count == 0) breakfastMeals = _mealDatabase.GetAllMeals().ToList();
        }

        var mainMeals = _mealDatabase.GetFilteredMeals(
            diet: tagFilter,
            excludedAllergens: excludedAllergens,
            favoriteIds: favoriteMealIds,
            isBreakfast: false
        );
        if (mainMeals.Count == 0)
        {
            mainMeals = _mealDatabase.GetAllMeals().ToList();
        }

        // Determine starting Monday
        var today = DateTime.Today;
        int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
        var startMonday = today.AddDays(-diff);

        if (!string.IsNullOrWhiteSpace(startDateStr) && DateTime.TryParse(startDateStr, CultureInfo.InvariantCulture, out var parsedDate))
        {
            int parsedDiff = (7 + (parsedDate.DayOfWeek - DayOfWeek.Monday)) % 7;
            startMonday = parsedDate.AddDays(-parsedDiff);
        }

        var multiPlan = new MultiWeekPlan
        {
            Servings = servings,
            WeeksCount = weeksCount,
            ActiveWeekIndex = 0,
            StartDate = startMonday.ToString("yyyy-MM-dd")
        };

        var allPlannedMeals = new List<Meal>();
        var breakfastPool = breakfastMeals.OrderBy(_ => _random.Next()).ToList();
        var mainPool = mainMeals.OrderBy(_ => _random.Next()).ToList();
        int bIdx = 0;
        int mIdx = 0;

        for (int w = 0; w < weeksCount; w++)
        {
            var weekMonday = startMonday.AddDays(w * 7);
            var weekSunday = weekMonday.AddDays(6);
            int isoWeek = ISOWeek.GetWeekOfYear(weekMonday);

            var plannedWeek = new PlannedWeek
            {
                WeekIndex = w,
                WeekNumber = isoWeek,
                Label = $"KW {isoWeek} • {weekMonday.ToString("dd. MMM", new CultureInfo("de-AT"))} – {weekSunday.ToString("dd. MMM", new CultureInfo("de-AT"))}",
                StartDate = weekMonday.ToString("yyyy-MM-dd"),
                EndDate = weekSunday.ToString("yyyy-MM-dd"),
                Days = new()
            };

            var weekMeals = new List<Meal>();

            for (int d = 0; d < 7; d++)
            {
                var dayDate = weekMonday.AddDays(d);
                var planDay = new WeeklyPlanDay
                {
                    DayName = DayNames[d],
                    Date = dayDate.ToString("yyyy-MM-dd"),
                    FormattedDate = dayDate.ToString("dd. MMM", new CultureInfo("de-AT")),
                    IsToday = dayDate.Date == today,
                    DayIndex = d,
                    WeekIndex = w
                };

                // Check for locked meals for this day
                var lockedBreakfast = lockedMeals?.FirstOrDefault(l => l.WeekIndex == w && l.DayIndex == d && l.MealType == "breakfast");
                var lockedLunch = lockedMeals?.FirstOrDefault(l => l.WeekIndex == w && l.DayIndex == d && l.MealType == "lunch");
                var lockedDinner = lockedMeals?.FirstOrDefault(l => l.WeekIndex == w && l.DayIndex == d && l.MealType == "dinner");

                // 1. Breakfast Slot
                if (includeBreakfast)
                {
                    if (lockedBreakfast != null && !string.IsNullOrEmpty(lockedBreakfast.MealId))
                    {
                        planDay.Breakfast = _mealDatabase.GetMealById(lockedBreakfast.MealId) ?? breakfastMeals.FirstOrDefault();
                    }
                    else
                    {
                        if (bIdx >= breakfastPool.Count)
                        {
                            breakfastPool = breakfastMeals.OrderBy(_ => _random.Next()).ToList();
                            bIdx = 0;
                        }
                        planDay.Breakfast = breakfastPool[bIdx++];
                    }

                    if (planDay.Breakfast != null)
                    {
                        weekMeals.Add(planDay.Breakfast);
                        allPlannedMeals.Add(planDay.Breakfast);
                    }
                }

                // 2. Lunch Slot
                if (includeLunch)
                {
                    if (lockedLunch != null && !string.IsNullOrEmpty(lockedLunch.MealId))
                    {
                        planDay.Lunch = _mealDatabase.GetMealById(lockedLunch.MealId) ?? mainMeals.FirstOrDefault();
                    }
                    else
                    {
                        if (mIdx >= mainPool.Count)
                        {
                            mainPool = mainMeals.OrderBy(_ => _random.Next()).ToList();
                            mIdx = 0;
                        }
                        planDay.Lunch = mainPool[mIdx++];
                    }

                    if (planDay.Lunch != null)
                    {
                        weekMeals.Add(planDay.Lunch);
                        allPlannedMeals.Add(planDay.Lunch);
                    }
                }

                // 3. Dinner Slot
                if (includeDinner)
                {
                    if (lockedDinner != null && !string.IsNullOrEmpty(lockedDinner.MealId))
                    {
                        planDay.Dinner = _mealDatabase.GetMealById(lockedDinner.MealId) ?? mainMeals.FirstOrDefault();
                    }
                    else
                    {
                        if (mIdx >= mainPool.Count)
                        {
                            mainPool = mainMeals.OrderBy(_ => _random.Next()).ToList();
                            mIdx = 0;
                        }
                        planDay.Dinner = mainPool[mIdx++];
                    }

                    if (planDay.Dinner != null)
                    {
                        weekMeals.Add(planDay.Dinner);
                        allPlannedMeals.Add(planDay.Dinner);
                    }
                }

                plannedWeek.Days.Add(planDay);
            }

            plannedWeek.NutritionSummary = CalculateNutritionSummaryForMeals(weekMeals);
            multiPlan.Weeks.Add(plannedWeek);
        }

        multiPlan.OverallNutritionSummary = CalculateNutritionSummaryForMeals(allPlannedMeals);

        return multiPlan;
    }

    public static WeeklyNutritionSummary CalculateNutritionSummaryForMeals(List<Meal> meals)
    {
        if (meals.Count == 0) return new WeeklyNutritionSummary();

        return new WeeklyNutritionSummary
        {
            AverageCalories = (int)Math.Round(meals.Average(m => m.Nutrition.Calories)),
            AverageProtein = (int)Math.Round(meals.Average(m => m.Nutrition.Protein)),
            AverageCarbs = (int)Math.Round(meals.Average(m => m.Nutrition.Carbs)),
            AverageFat = (int)Math.Round(meals.Average(m => m.Nutrition.Fat)),
            TotalCalories = meals.Sum(m => m.Nutrition.Calories)
        };
    }

    public Meal? RerollSingleMeal(
        string? tagFilter,
        List<string> currentMealIds,
        List<string>? excludedAllergens = null,
        List<string>? favoriteMealIds = null,
        bool isBreakfast = false)
    {
        var eligibleMeals = _mealDatabase.GetFilteredMeals(
            diet: tagFilter,
            excludedAllergens: excludedAllergens,
            favoriteIds: favoriteMealIds,
            isBreakfast: isBreakfast
        );

        if (eligibleMeals.Count == 0)
        {
            eligibleMeals = _mealDatabase.GetFilteredMeals(isBreakfast: isBreakfast);
            if (eligibleMeals.Count == 0) eligibleMeals = _mealDatabase.GetAllMeals().ToList();
        }

        var pool = eligibleMeals.Where(m => !currentMealIds.Contains(m.Id)).ToList();
        if (pool.Count == 0)
        {
            pool = eligibleMeals;
        }

        return pool[_random.Next(pool.Count)];
    }

    public List<AggregatedItem> AggregateIngredients(IEnumerable<Meal> meals, int servings = 2, bool excludePantryStaples = false)
    {
        var dict = new Dictionary<string, AggregatedItem>(StringComparer.OrdinalIgnoreCase);
        decimal servingMultiplier = servings > 0 ? servings : 2;

        foreach (var meal in meals)
        {
            decimal scale = meal.DefaultServings > 0 ? (servingMultiplier / meal.DefaultServings) : 1m;

            foreach (var ing in meal.Ingredients)
            {
                if (excludePantryStaples && ing.IsPantryStaple)
                    continue;

                var key = $"{ing.SearchTerm.ToLowerInvariant()}_{ing.Unit.ToLowerInvariant()}";

                if (!dict.TryGetValue(key, out var agg))
                {
                    agg = new AggregatedItem
                    {
                        Name = ing.Name,
                        SearchTerm = ing.SearchTerm,
                        TotalAmount = 0,
                        Unit = ing.Unit,
                        Category = ing.Category,
                        IsPantryStaple = ing.IsPantryStaple,
                        Checked = !ing.IsPantryStaple,
                        UsedInMeals = new()
                    };
                    dict[key] = agg;
                }

                agg.TotalAmount += Math.Round(ing.Amount * scale, 1);
                if (!agg.UsedInMeals.Contains(meal.Name))
                {
                    agg.UsedInMeals.Add(meal.Name);
                }
            }
        }

        var categoryOrder = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            { "Gemüse & Obst", 1 },
            { "Milchprodukte & Eier", 2 },
            { "Fleisch & Fisch", 3 },
            { "Brot & Gebäck", 4 },
            { "Vorratsschrank", 5 },
            { "Gewürze", 6 }
        };

        return dict.Values
            .OrderBy(i => categoryOrder.TryGetValue(i.Category, out var order) ? order : 99)
            .ThenBy(i => i.Name)
            .ToList();
    }

    public List<AggregatedItem> AggregateMultiWeekPlan(MultiWeekPlan plan, int? weekIndex = null, bool excludePantryStaples = false)
    {
        var meals = new List<Meal>();

        if (weekIndex.HasValue && weekIndex.Value >= 0 && weekIndex.Value < plan.Weeks.Count)
        {
            var targetWeek = plan.Weeks[weekIndex.Value];
            foreach (var day in targetWeek.Days)
            {
                if (day.Breakfast != null) meals.Add(day.Breakfast);
                if (day.Lunch != null) meals.Add(day.Lunch);
                if (day.Dinner != null) meals.Add(day.Dinner);
            }
        }
        else
        {
            foreach (var week in plan.Weeks)
            {
                foreach (var day in week.Days)
                {
                    if (day.Breakfast != null) meals.Add(day.Breakfast);
                    if (day.Lunch != null) meals.Add(day.Lunch);
                    if (day.Dinner != null) meals.Add(day.Dinner);
                }
            }
        }

        return AggregateIngredients(meals, plan.Servings, excludePantryStaples);
    }

    public List<AggregatedItem> AggregateIngredientsByIds(IEnumerable<string> mealIds, int servings = 2, bool excludePantryStaples = false)
    {
        var meals = mealIds
            .Select(id => _mealDatabase.GetMealById(id))
            .Where(m => m != null)
            .Cast<Meal>()
            .ToList();

        return AggregateIngredients(meals, servings, excludePantryStaples);
    }
}
