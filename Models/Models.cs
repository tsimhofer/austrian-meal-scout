namespace AustrianMealScout.Models;

public class NutritionInfo
{
    public int Calories { get; set; } = 550; // kcal per serving
    public int Protein { get; set; } = 25;   // grams per serving
    public int Carbs { get; set; } = 55;     // grams per serving
    public int Fat { get; set; } = 22;       // grams per serving
    public int Fiber { get; set; } = 5;       // grams per serving
    public int PortionWeightGrams { get; set; } = 380; // approximate portion weight in grams

    // Macros per 100g
    public int CaloriesPer100g => PortionWeightGrams > 0 ? (int)Math.Round((double)Calories * 100 / PortionWeightGrams) : (int)Math.Round(Calories * 0.26);
    public double ProteinPer100g => PortionWeightGrams > 0 ? Math.Round((double)Protein * 100 / PortionWeightGrams, 1) : Math.Round(Protein * 0.26, 1);
    public double CarbsPer100g => PortionWeightGrams > 0 ? Math.Round((double)Carbs * 100 / PortionWeightGrams, 1) : Math.Round(Carbs * 0.26, 1);
    public double FatPer100g => PortionWeightGrams > 0 ? Math.Round((double)Fat * 100 / PortionWeightGrams, 1) : Math.Round(Fat * 0.26, 1);
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

public class LockedMealItem
{
    public int WeekIndex { get; set; } = 0;
    public int DayIndex { get; set; } = 0;
    public string MealType { get; set; } = "dinner"; // "breakfast", "lunch", "dinner"
    public string MealId { get; set; } = string.Empty;
}

public class WeeklyPlanDay
{
    public string DayName { get; set; } = string.Empty; // "Montag", "Dienstag", etc.
    public string Date { get; set; } = string.Empty;    // "2026-10-19"
    public string FormattedDate { get; set; } = string.Empty; // "19. Okt"
    public bool IsToday { get; set; } = false;
    public int DayIndex { get; set; } = 0; // 0 = Montag ... 6 = Sonntag
    public int WeekIndex { get; set; } = 0;
    public Meal? Breakfast { get; set; }
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

public class WhoProfileModel
{
    public string Gender { get; set; } = "male";
    public int Age { get; set; } = 30;
    public double Weight { get; set; } = 75;
    public double Height { get; set; } = 178;
    public double Pal { get; set; } = 1.6;
    public string Goal { get; set; } = "maintain";
}

public class UserPreferences
{
    public string TagFilter { get; set; } = "all";
    public int DefaultServings { get; set; } = 2;
    public bool IncludeBreakfast { get; set; } = false;
    public bool IncludeLunch { get; set; } = false;
    public bool IncludeDinner { get; set; } = true;
    public List<string> ExcludedAllergens { get; set; } = new();
    public List<string> FavoriteMealIds { get; set; } = new();
    public List<string> FavoriteProducts { get; set; } = new(); // format: "STORE_ProductName"
    public WhoProfileModel WhoProfile { get; set; } = new();
    public List<Meal> CustomMeals { get; set; } = new();
}

public class UserActivityItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = "info"; // "plan", "cook", "save", "favorite"
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class UserStatistics
{
    public int PlansGeneratedCount { get; set; } = 0;
    public int MealsCookedCount { get; set; } = 0;
    public long TotalCaloriesPlanned { get; set; } = 0;
    public decimal EstimatedMoneySaved { get; set; } = 0m;
    public string FavoriteStore { get; set; } = "SPAR";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActive { get; set; } = DateTime.UtcNow;
    public List<UserActivityItem> RecentActivity { get; set; } = new();
}

public class UserAccount
{
    public string Id { get; set; } = string.Empty; // Google Sub ID or Generated ID
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string PictureUrl { get; set; } = string.Empty;
    public string AuthProvider { get; set; } = "google";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public UserPreferences Preferences { get; set; } = new();
    public UserStatistics Statistics { get; set; } = new();
}

public class GoogleAuthRequest
{
    public string? Credential { get; set; } // Google ID Token (JWT)
    public bool IsDemo { get; set; } = false;
    public string? DemoEmail { get; set; }
    public string? DemoName { get; set; }
    public string? DemoPicture { get; set; }
}

public class AuthResponse
{
    public bool Success { get; set; }
    public string Token { get; set; } = string.Empty;
    public UserAccount User { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

public class RecordStatisticRequest
{
    public string Action { get; set; } = string.Empty; // "plan_generated", "meal_cooked", "money_saved"
    public int ValueInt { get; set; } = 0;
    public decimal ValueDecimal { get; set; } = 0m;
    public string? Details { get; set; }
}
