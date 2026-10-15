using Microsoft.AspNetCore.Mvc;
using AustrianMealScout.Models;
using AustrianMealScout.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<SupermarketScoutService>();
builder.Services.AddHttpClient<UserService>();
builder.Services.AddSingleton<UserService>();
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

// 2b. Add custom meal
app.MapPost("/api/meals", ([FromServices] MealDatabase db, [FromBody] Meal meal) =>
{
    if (string.IsNullOrWhiteSpace(meal.Name))
        return Results.BadRequest(new { message = "Name des Gerichts ist erforderlich." });
    var created = db.AddCustomMeal(meal);
    return Results.Created($"/api/meals/{created.Id}", created);
});

// 3. Generate randomized calendar/multi-week plan
app.MapPost("/api/plan/generate", ([FromServices] MealPlannerService planner, [FromBody] PlanRequest request) =>
{
    var plan = planner.GenerateMultiWeekPlan(
        request.TagFilter,
        request.Servings,
        request.IncludeBreakfast,
        request.IncludeLunch,
        request.IncludeDinner,
        request.WeeksCount,
        request.StartDate,
        request.ExcludedAllergens,
        request.FavoriteMealIds,
        request.LockedMeals
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
        request.FavoriteMealIds,
        request.IsBreakfast
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

// --- User Authentication & Personal Cloud Storage Endpoints ---

// Helper to extract session token from Authorization or X-User-Token header
string? ExtractToken(HttpContext context)
{
    var authHeader = context.Request.Headers.Authorization.ToString();
    if (!string.IsNullOrWhiteSpace(authHeader))
    {
        return authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader[7..].Trim()
            : authHeader.Trim();
    }
    return context.Request.Headers["X-User-Token"].FirstOrDefault();
}

// 8. Auth configuration (Google Client ID if configured)
app.MapGet("/api/auth/config", (IConfiguration config) =>
{
    var clientId = config["Authentication:Google:ClientId"] 
        ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") 
        ?? "";
    return Results.Ok(new { googleClientId = clientId });
});

// 9. Login with Google (or Demo account)
app.MapPost("/api/auth/google", async ([FromServices] UserService userService, [FromBody] GoogleAuthRequest request) =>
{
    var response = await userService.AuthenticateGoogleAsync(request);
    return response.Success ? Results.Ok(response) : Results.BadRequest(response);
});

// 10. Get current authenticated user
app.MapGet("/api/auth/me", ([FromServices] UserService userService, HttpContext context) =>
{
    var token = ExtractToken(context);
    var user = userService.GetUserByToken(token);
    return user != null ? Results.Ok(user) : Results.Unauthorized();
});

// 11. Logout
app.MapPost("/api/auth/logout", ([FromServices] UserService userService, HttpContext context) =>
{
    var token = ExtractToken(context);
    userService.Logout(token);
    return Results.Ok(new { message = "Erfolgreich abgemeldet." });
});

// 12. Get User Preferences
app.MapGet("/api/user/preferences", ([FromServices] UserService userService, HttpContext context) =>
{
    var token = ExtractToken(context);
    var user = userService.GetUserByToken(token);
    return user != null ? Results.Ok(user.Preferences) : Results.Unauthorized();
});

// 13. Save User Preferences
app.MapPost("/api/user/preferences", ([FromServices] UserService userService, HttpContext context, [FromBody] UserPreferences preferences) =>
{
    var token = ExtractToken(context);
    var user = userService.GetUserByToken(token);
    if (user == null) return Results.Unauthorized();

    userService.UpdatePreferences(user.Id, preferences);
    return Results.Ok(new { message = "Präferenzen gespeichert.", preferences = user.Preferences });
});

// 14. Get User Statistics
app.MapGet("/api/user/statistics", ([FromServices] UserService userService, HttpContext context) =>
{
    var token = ExtractToken(context);
    var user = userService.GetUserByToken(token);
    return user != null ? Results.Ok(user.Statistics) : Results.Unauthorized();
});

// 15. Record a user statistic event
app.MapPost("/api/user/statistics/record", ([FromServices] UserService userService, HttpContext context, [FromBody] RecordStatisticRequest request) =>
{
    var token = ExtractToken(context);
    var user = userService.GetUserByToken(token);
    if (user == null) return Results.Unauthorized();

    userService.RecordStatistic(user.Id, request);
    return Results.Ok(new { message = "Statistik aktualisiert.", statistics = user.Statistics });
});

app.Run();

// Request and response contracts
public record PlanRequest(
    string? TagFilter = "all",
    int Servings = 2,
    bool IncludeBreakfast = false,
    bool IncludeLunch = false,
    bool IncludeDinner = true,
    int WeeksCount = 1,
    string? StartDate = null,
    List<string>? ExcludedAllergens = null,
    List<string>? FavoriteMealIds = null,
    List<LockedMealItem>? LockedMeals = null
);

public record PlanResponse(MultiWeekPlan Plan, List<AggregatedItem> Ingredients);

public record RerollRequest(
    string? TagFilter = "all",
    List<string> CurrentMealIds = null!,
    List<string>? ExcludedAllergens = null,
    List<string>? FavoriteMealIds = null,
    bool IsBreakfast = false
);

public record AggregateRequest(
    List<string>? MealIds = null,
    MultiWeekPlan? Plan = null,
    int? WeekIndex = null,
    int Servings = 2,
    bool ExcludePantryStaples = false
);
