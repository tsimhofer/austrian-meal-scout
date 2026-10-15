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
        bool includeLunches = false,
        int weeksCount = 1,
        string? startDateStr = null,
        List<string>? excludedAllergens = null,
        List<string>? favoriteMealIds = null)
    {
        weeksCount = Math.Clamp(weeksCount, 1, 6);

        var eligibleMeals = _mealDatabase.GetFilteredMeals(
            diet: tagFilter,
            excludedAllergens: excludedAllergens,
            favoriteIds: favoriteMealIds
        );

        if (eligibleMeals.Count == 0)
        {
            eligibleMeals = _mealDatabase.GetAllMeals().ToList();
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
        var pool = eligibleMeals.OrderBy(_ => _random.Next()).ToList();
        int poolIdx = 0;

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

                if (includeLunches)
                {
                    if (poolIdx >= pool.Count)
                    {
                        pool = eligibleMeals.OrderBy(_ => _random.Next()).ToList();
                        poolIdx = 0;
                    }
                    planDay.Lunch = pool[poolIdx++];
                    weekMeals.Add(planDay.Lunch);
                    allPlannedMeals.Add(planDay.Lunch);
                }

                if (poolIdx >= pool.Count)
                {
                    pool = eligibleMeals.OrderBy(_ => _random.Next()).ToList();
                    poolIdx = 0;
                }
                planDay.Dinner = pool[poolIdx++];
                weekMeals.Add(planDay.Dinner);
                allPlannedMeals.Add(planDay.Dinner);

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
        List<string>? favoriteMealIds = null)
    {
        var eligibleMeals = _mealDatabase.GetFilteredMeals(
            diet: tagFilter,
            excludedAllergens: excludedAllergens,
            favoriteIds: favoriteMealIds
        );

        if (eligibleMeals.Count == 0)
        {
            eligibleMeals = _mealDatabase.GetAllMeals().ToList();
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
