namespace AustrianMealScout.Models;

public class NutritionInfo
{
    public int Calories { get; set; } = 550; // kcal per serving
    public int Protein { get; set; } = 25;   // grams per serving
    public int Carbs { get; set; } = 55;     // grams per serving
    public int Fat { get; set; } = 22;       // grams per serving
    public int Fiber { get; set; } = 5;       // grams per serving
}

public class WeeklyNutritionSummary
{
    public int AverageCalories { get; set; }
    public int AverageProtein { get; set; }
    public int AverageCarbs { get; set; }
    public int AverageFat { get; set; }
    public int TotalCalories { get; set; }
}

public class Meal
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new(); // "austrian", "vegetarian", "vegan", "quick", "budget", "meat", "fish"
    public List<string> Allergens { get; set; } = new(); // "gluten", "lactose", "egg", "fish", "nuts"
    public int PrepTimeMinutes { get; set; } = 30;
    public string Difficulty { get; set; } = "Einfach";
    public int DefaultServings { get; set; } = 2;
    public string Emoji { get; set; } = "🍲";
    public NutritionInfo Nutrition { get; set; } = new();
    public List<MealIngredient> Ingredients { get; set; } = new();
}

public class MealIngredient
{
    public string Name { get; set; } = string.Empty;
    public string SearchTerm { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string Category { get; set; } = "Vorratsschrank";
    public bool IsPantryStaple { get; set; } = false;
}

public class WeeklyPlanDay
{
    public string DayName { get; set; } = string.Empty; // "Montag", "Dienstag", etc.
    public string Date { get; set; } = string.Empty;    // "2026-10-19"
    public string FormattedDate { get; set; } = string.Empty; // "19. Okt"
    public bool IsToday { get; set; } = false;
    public int DayIndex { get; set; } = 0; // 0 = Montag ... 6 = Sonntag
    public int WeekIndex { get; set; } = 0;
    public Meal? Lunch { get; set; }
    public Meal? Dinner { get; set; }
}

public class PlannedWeek
{
    public int WeekIndex { get; set; } = 0; // 0-based
    public int WeekNumber { get; set; } = 42; // ISO calendar week
    public string Label { get; set; } = string.Empty; // "KW 42 • 19. Okt – 25. Okt"
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public List<WeeklyPlanDay> Days { get; set; } = new();
    public WeeklyNutritionSummary NutritionSummary { get; set; } = new();
}

public class MultiWeekPlan
{
    public int Servings { get; set; } = 2;
    public int WeeksCount { get; set; } = 1;
    public int ActiveWeekIndex { get; set; } = 0;
    public string StartDate { get; set; } = string.Empty;
    public List<PlannedWeek> Weeks { get; set; } = new();
    public WeeklyNutritionSummary OverallNutritionSummary { get; set; } = new();

    // Convenience property for 1st / active week days
    public List<WeeklyPlanDay> Days => Weeks.Count > 0 ? Weeks[0].Days : new();
    public WeeklyNutritionSummary NutritionSummary => Weeks.Count > 0 ? Weeks[0].NutritionSummary : new();
}

// Backward compatibility alias for single week plan references
public class WeeklyPlan : MultiWeekPlan
{
}

public class AggregatedItem
{
    public string Name { get; set; } = string.Empty;
    public string SearchTerm { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string Category { get; set; } = "Vorratsschrank";
    public bool IsPantryStaple { get; set; }
    public bool Checked { get; set; } = true;
    public List<string> UsedInMeals { get; set; } = new();
}

public class ScoutedProduct
{
    public string Store { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string UnitPrice { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string ProductUrl { get; set; } = string.Empty;
    public bool IsBio { get; set; }
    public bool IsCheapest { get; set; }
}

public class IngredientScoutResult
{
    public string Name { get; set; } = string.Empty;
    public string SearchTerm { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Unit { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string RecommendedStore { get; set; } = string.Empty;
    public decimal RecommendedPrice { get; set; }
    public List<ScoutedProduct> AvailableProducts { get; set; } = new();
}

public class ShoppingListScoutResponse
{
    public List<IngredientScoutResult> Items { get; set; } = new();
    public decimal SparTotal { get; set; }
    public decimal BillaTotal { get; set; }
    public decimal HoferTotal { get; set; }
    public decimal OptimizedCheapestTotal { get; set; }
    public decimal PotentialSavings { get; set; }
    public string BestSingleStore { get; set; } = "SPAR";
}
