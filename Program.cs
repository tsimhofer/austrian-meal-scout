using Microsoft.AspNetCore.Mvc;
using AustrianMealScout.Models;
using AustrianMealScout.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<SupermarketScoutService>();
builder.Services.AddSingleton<MealDatabase>();
builder.Services.AddSingleton<MealPlannerService>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

var app = builder.Build();

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// --- REST Endpoints ---

// 1. Get all meals
app.MapGet("/api/meals", ([FromServices] MealDatabase db, string? tag, string? category, int? maxPrepTime) =>
{
    var meals = db.GetFilteredMeals(diet: tag, maxPrepTime: maxPrepTime);
    return Results.Ok(meals);
});

// 2. Get meal by ID
app.MapGet("/api/meals/{id}", ([FromServices] MealDatabase db, string id) =>
{
    var meal = db.GetMealById(id);
    return meal != null ? Results.Ok(meal) : Results.NotFound(new { message = $"Meal with id '{id}' not found." });
});

// 3. Generate randomized calendar/multi-week plan
app.MapPost("/api/plan/generate", ([FromServices] MealPlannerService planner, [FromBody] PlanRequest request) =>
{
    var plan = planner.GenerateMultiWeekPlan(
        request.TagFilter,
        request.Servings,
        request.IncludeLunches,
        request.WeeksCount,
        request.StartDate,
        request.ExcludedAllergens,
        request.FavoriteMealIds
    );
    var ingredients = planner.AggregateMultiWeekPlan(plan, weekIndex: 0, excludePantryStaples: false);
    return Results.Ok(new PlanResponse(plan, ingredients));
});

// 4. Reroll a single meal
app.MapPost("/api/plan/reroll", ([FromServices] MealPlannerService planner, [FromBody] RerollRequest request) =>
{
    var newMeal = planner.RerollSingleMeal(
        request.TagFilter,
        request.CurrentMealIds,
        request.ExcludedAllergens,
        request.FavoriteMealIds
    );
    return newMeal != null ? Results.Ok(newMeal) : Results.NotFound();
});

// 5. Aggregate ingredients for a plan or list of meal IDs
app.MapPost("/api/ingredients/aggregate", ([FromServices] MealPlannerService planner, [FromBody] AggregateRequest request) =>
{
    List<AggregatedItem> ingredients;
    if (request.MealIds != null && request.MealIds.Count > 0)
    {
        ingredients = planner.AggregateIngredientsByIds(request.MealIds, request.Servings, request.ExcludePantryStaples);
    }
    else if (request.Plan != null)
    {
        ingredients = planner.AggregateMultiWeekPlan(request.Plan, request.WeekIndex, request.ExcludePantryStaples);
    }
    else
    {
        ingredients = new List<AggregatedItem>();
    }

    return Results.Ok(ingredients);
});

// 6. Scout supermarket APIs for the shopping list
app.MapPost("/api/scout/list", async ([FromServices] SupermarketScoutService scout, [FromBody] List<AggregatedItem> items) =>
{
    var response = await scout.ScoutShoppingListAsync(items);
    return Results.Ok(response);
});

// 7. Scout single item (e.g. for custom user additions)
app.MapGet("/api/scout/item", async ([FromServices] SupermarketScoutService scout, string query, string? category) =>
{
    var item = new AggregatedItem
    {
        Name = query,
        SearchTerm = query,
        Category = category ?? "Vorratsschrank",
        TotalAmount = 1,
        Unit = "Stk",
        Checked = true
    };
    var result = await scout.ScoutSingleIngredientAsync(item);
    return Results.Ok(result);
});

app.Run();

// Request and response contracts
public record PlanRequest(
    string? TagFilter = "all",
    int Servings = 2,
    bool IncludeLunches = false,
    int WeeksCount = 1,
    string? StartDate = null,
    List<string>? ExcludedAllergens = null,
    List<string>? FavoriteMealIds = null
);

public record PlanResponse(MultiWeekPlan Plan, List<AggregatedItem> Ingredients);

public record RerollRequest(
    string? TagFilter = "all",
    List<string> CurrentMealIds = null!,
    List<string>? ExcludedAllergens = null,
    List<string>? FavoriteMealIds = null
);

public record AggregateRequest(
    List<string>? MealIds = null,
    MultiWeekPlan? Plan = null,
    int? WeekIndex = null,
    int Servings = 2,
    bool ExcludePantryStaples = false
);
