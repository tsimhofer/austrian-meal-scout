using AustrianMealScout.Models;

namespace AustrianMealScout.Services;

public class MealDatabase
{
    private readonly List<Meal> _meals;

    public MealDatabase()
    {
        _meals = InitializeMeals();
    }

    public IReadOnlyList<Meal> GetAllMeals() => _meals;

    public Meal? GetMealById(string id) => _meals.FirstOrDefault(m => m.Id == id);

    public List<Meal> GetFilteredMeals(
        string? diet = null,
        List<string>? excludedAllergens = null,
        List<string>? favoriteIds = null,
        int? maxPrepTime = null)
    {
        var query = _meals.AsEnumerable();

        // 1. Dietary Filtering (Strict Separation of Vegetarian & Vegan)
        if (!string.IsNullOrWhiteSpace(diet) && diet != "all")
        {
            var d = diet.ToLowerInvariant();
            if (d == "vegan")
            {
                query = query.Where(m => m.Tags.Contains("vegan"));
            }
            else if (d == "vegetarian")
            {
                // Vegetarian includes vegetarian and vegan
                query = query.Where(m => m.Tags.Contains("vegetarian") || m.Tags.Contains("vegan"));
            }
            else if (d == "favorites" && favoriteIds != null && favoriteIds.Count > 0)
            {
                query = query.Where(m => favoriteIds.Contains(m.Id));
            }
            else
            {
                query = query.Where(m => m.Tags.Any(t => t.Equals(d, StringComparison.OrdinalIgnoreCase)));
            }
        }

        // 2. Allergen Filtering (Exclusions)
        if (excludedAllergens != null && excludedAllergens.Count > 0)
        {
            foreach (var allergen in excludedAllergens)
            {
                var a = allergen.ToLowerInvariant().Trim();
                query = query.Where(m => !m.Allergens.Contains(a));
            }
        }

        // 3. Prep Time Filter
        if (maxPrepTime.HasValue && maxPrepTime.Value > 0)
        {
            query = query.Where(m => m.PrepTimeMinutes <= maxPrepTime.Value);
        }

        var results = query.ToList();

        // Fallback: If allergen/diet filters leave fewer than 3 meals, relax slightly to prevent crashes
        if (results.Count == 0 && (excludedAllergens == null || excludedAllergens.Count == 0))
        {
            return _meals;
        }

        return results;
    }

    private static List<Meal> InitializeMeals()
    {
        return new List<Meal>
        {
            // --- 1. Wiener Schnitzel ---
            new Meal
            {
                Id = "wiener-schnitzel",
                Name = "Wiener Schnitzel mit Petersilerdäpfel",
                Description = "Der unangefochtene österreichische Klassiker – hauchdünn paniert und goldgelb souffliert gebacken mit buttrigen Petersilkartoffeln.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 35,
                Difficulty = "Mittel",
                Emoji = "🥩",
                DefaultServings = 2,
                Nutrition = new() { Calories = 680, Protein = 42, Carbs = 48, Fat = 32, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Kalbs- oder Schweinsschnitzel", SearchTerm = "Schweinsschnitzel", Amount = 400, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Erdäpfel (vorwiegend festkochend)", SearchTerm = "Erdäpfel", Amount = 600, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Semmelbrösel", SearchTerm = "Semmelbrösel", Amount = 150, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Mehl glatt", SearchTerm = "Mehl", Amount = 80, Unit = "g", Category = "Vorratsschrank", IsPantryStaple = true },
                    new() { Name = "Butter", SearchTerm = "Teebutter", Amount = 50, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Frische Petersilie", SearchTerm = "Petersilie", Amount = 1, Unit = "Bund", Category = "Gemüse & Obst" },
                    new() { Name = "Zitrone", SearchTerm = "Zitrone", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Preiselbeermarmelade", SearchTerm = "Preiselbeeren", Amount = 150, Unit = "g", Category = "Vorratsschrank" }
                }
            },

            // --- 2. Käsespätzle ---
            new Meal
            {
                Id = "kaesespaetzle",
                Name = "Käsespätzle mit Röstzwiebeln",
                Description = "Herzhafte Vorarlberger Art mit kräftigem Bergkäse und knusprig frittierten Zwiebelringen.",
                Category = "Klassiker",
                Tags = new() { "austrian", "vegetarian", "budget", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 30,
                Difficulty = "Einfach",
                Emoji = "🧀",
                DefaultServings = 2,
                Nutrition = new() { Calories = 720, Protein = 31, Carbs = 65, Fat = 36, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Spätzlemehl / Griffiges Mehl", SearchTerm = "Mehl", Amount = 300, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 3, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Würziger Bergkäse gerieben", SearchTerm = "Bergkäse", Amount = 200, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Emmentaler oder Gouda gerieben", SearchTerm = "Emmentaler", Amount = 100, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Zwiebeln", SearchTerm = "Zwiebel", Amount = 3, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Butter", SearchTerm = "Teebutter", Amount = 40, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Frischer Schnittlauch", SearchTerm = "Schnittlauch", Amount = 1, Unit = "Bund", Category = "Gemüse & Obst" }
                }
            },

            // --- 3. Tiroler Gröstl ---
            new Meal
            {
                Id = "tiroler-groestl",
                Name = "Tiroler Gröstl mit Spiegelei",
                Description = "Knusprig gebratene Erdäpfelscheiben mit Rindfleisch, Zwiebeln, frischem Majoran und Spiegelei.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "quick", "classic" },
                Allergens = new() { "egg", "lactose" },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🍳",
                DefaultServings = 2,
                Nutrition = new() { Calories = 610, Protein = 28, Carbs = 45, Fat = 34, Fiber = 4 },
                Ingredients = new()
                {
                    new() { Name = "Gekochte Erdäpfel", SearchTerm = "Erdäpfel", Amount = 500, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Rindfleisch gekocht oder Speck", SearchTerm = "Bauchspeck", Amount = 250, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Zwiebel", SearchTerm = "Zwiebel", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Eier für Spiegeleier", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Butter", SearchTerm = "Teebutter", Amount = 30, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Kümmel & Majoran", SearchTerm = "Majoran", Amount = 1, Unit = "TL", Category = "Gewürze", IsPantryStaple = true },
                    new() { Name = "Krautsalat als Beilage", SearchTerm = "Krautsalat", Amount = 250, Unit = "g", Category = "Gemüse & Obst" }
                }
            },

            // --- 4. Wiener Saftgulasch ---
            new Meal
            {
                Id = "wiener-saftgulasch",
                Name = "Wiener Saftgulasch mit Semmelknödeln",
                Description = "Zart geschmortes Wadschinken-Gulasch im Verhältnis 1:1 mit Zwiebeln eingekocht. Volles Aroma nach edelsüßem Paprika.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 90,
                Difficulty = "Mittel",
                Emoji = "🍲",
                DefaultServings = 2,
                Nutrition = new() { Calories = 580, Protein = 46, Carbs = 38, Fat = 24, Fiber = 4 },
                Ingredients = new()
                {
                    new() { Name = "Rindsgulaschfleisch (Wadschinken)", SearchTerm = "Gulaschfleisch", Amount = 600, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Zwiebeln", SearchTerm = "Zwiebel", Amount = 600, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Knödelbrot", SearchTerm = "Knödelbrot", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Milch", SearchTerm = "Milch", Amount = 150, Unit = "ml", Category = "Milchprodukte & Eier" },
                    new() { Name = "Eier für Knödel", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Paprikapulver edelsüß", SearchTerm = "Paprikapulver", Amount = 50, Unit = "g", Category = "Gewürze" },
                    new() { Name = "Tomatenmark", SearchTerm = "Tomatenmark", Amount = 50, Unit = "g", Category = "Vorratsschrank" }
                }
            },

            // --- 5. Fluffiger Kaiserschmarrn ---
            new Meal
            {
                Id = "kaiserschmarrn",
                Name = "Fluffiger Kaiserschmarrn mit Zwetschkenröster",
                Description = "Der kaiserliche Dessert-Klassiker aus der Pfanne, mit steif geschlagenem Eischnee und karamellisiertem Staubzucker.",
                Category = "Süßspeise",
                Tags = new() { "austrian", "vegetarian", "sweet", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🥞",
                DefaultServings = 2,
                Nutrition = new() { Calories = 540, Protein = 16, Carbs = 72, Fat = 20, Fiber = 2 },
                Ingredients = new()
                {
                    new() { Name = "Mehl glatt", SearchTerm = "Mehl", Amount = 150, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Milch", SearchTerm = "Vollmilch", Amount = 250, Unit = "ml", Category = "Milchprodukte & Eier" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 4, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Butter zum Ausbacken", SearchTerm = "Teebutter", Amount = 40, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Zwetschkenröster oder Apfelmus", SearchTerm = "Zwetschkenröster", Amount = 1, Unit = "Glas", Category = "Vorratsschrank" }
                }
            },

            // --- 6. Steirischer Backhendlsalat ---
            new Meal
            {
                Id = "steirischer-backhendlsalat",
                Name = "Steirischer Backhendlsalat mit Kürbiskernöl",
                Description = "Knusprig panierte Hühnerbruststreifen auf knackigem Erdäpfel-Vogerlsalat, verfeinert mit echtem steirischen Kürbiskernöl g.g.A.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "classic" },
                Allergens = new() { "gluten", "egg" },
                PrepTimeMinutes = 30,
                Difficulty = "Einfach",
                Emoji = "🥗",
                DefaultServings = 2,
                Nutrition = new() { Calories = 520, Protein = 38, Carbs = 32, Fat = 26, Fiber = 4 },
                Ingredients = new()
                {
                    new() { Name = "Hühnerbrustfilet", SearchTerm = "Hühnerbrust", Amount = 400, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Vogerlsalat (Feldsalat)", SearchTerm = "Vogerlsalat", Amount = 150, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Erdäpfel festkochend", SearchTerm = "Erdäpfel", Amount = 400, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Steirisches Kürbiskernöl", SearchTerm = "Kürbiskernöl", Amount = 40, Unit = "ml", Category = "Vorratsschrank" },
                    new() { Name = "Semmelbrösel", SearchTerm = "Semmelbrösel", Amount = 100, Unit = "g", Category = "Vorratsschrank" }
                }
            },

            // --- 7. Schinkenfleckerl ---
            new Meal
            {
                Id = "schinkenfleckerl",
                Name = "Klassische Schinkenfleckerl mit grünem Salat",
                Description = "Österreichische Traditionsnudeln mit saftigem Beinschinken, Obers und goldbrauner Käsekruste aus dem Ofen.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "quick", "budget" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 35,
                Difficulty = "Einfach",
                Emoji = "🍲",
                DefaultServings = 2,
                Nutrition = new() { Calories = 560, Protein = 26, Carbs = 62, Fat = 22, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Österreichische Fleckerl Nudeln", SearchTerm = "Fleckerl", Amount = 300, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Beinschinken oder Schinkenwürfel", SearchTerm = "Beinschinken", Amount = 200, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Sauerrahm oder Schlagobers", SearchTerm = "Sauerrahm", Amount = 200, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Zwiebel", SearchTerm = "Zwiebel", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Grüner Blattsalat (Häuptelsalat)", SearchTerm = "Häuptelsalat", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // --- 8. Kaspressknödelsuppe ---
            new Meal
            {
                Id = "kaspressknoedel-suppe",
                Name = "Kaspressknödelsuppe mit Wurzelgemüse",
                Description = "Kräftige Rind- oder Gemüsesuppe mit saftig ausgebackenen Almkäse-Knödeln und frischem Schnittlauch.",
                Category = "Suppe & Eintopf",
                Tags = new() { "austrian", "vegetarian", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 40,
                Difficulty = "Mittel",
                Emoji = "🥣",
                DefaultServings = 2,
                Nutrition = new() { Calories = 420, Protein = 20, Carbs = 36, Fat = 21, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Knödelbrot", SearchTerm = "Knödelbrot", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Graukäse oder würziger Bergkäse", SearchTerm = "Bergkäse", Amount = 150, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Topfen (Quark)", SearchTerm = "Topfen", Amount = 100, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Suppengrün", SearchTerm = "Suppengemüse", Amount = 1, Unit = "Bund", Category = "Gemüse & Obst" }
                }
            },

            // --- 9. Faschierte Laibchen ---
            new Meal
            {
                Id = "faschierte-laibchen",
                Name = "Faschierte Laibchen mit Erdäpfelpüree",
                Description = "Würzige Frikadellen nach Oma-Rezept mit Majoran und Senf, serviert mit samtig buttrigem Kartoffelstampf.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "budget", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 35,
                Difficulty = "Einfach",
                Emoji = "🧆",
                DefaultServings = 2,
                Nutrition = new() { Calories = 620, Protein = 34, Carbs = 44, Fat = 31, Fiber = 4 },
                Ingredients = new()
                {
                    new() { Name = "Gemischtes Faschiertes", SearchTerm = "Faschiertes", Amount = 400, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Erdäpfel mehlig", SearchTerm = "Erdäpfel mehlig", Amount = 600, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Kaisersemmel altbacken", SearchTerm = "Kaisersemmel", Amount = 1, Unit = "Stk", Category = "Brot & Gebäck" },
                    new() { Name = "Milch", SearchTerm = "Milch", Amount = 150, Unit = "ml", Category = "Milchprodukte & Eier" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 1, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Butter für Püree", SearchTerm = "Teebutter", Amount = 40, Unit = "g", Category = "Milchprodukte & Eier" }
                }
            },

            // --- 10. Eiernockerl ---
            new Meal
            {
                Id = "eiernockerl",
                Name = "Eiernockerl mit Schnittlauch & grünem Salat",
                Description = "Blitzschnell, günstig und unverschämt gut: Frische Nockerl in der Pfanne mit verquirlten Eiern gestockt.",
                Category = "Klassiker",
                Tags = new() { "austrian", "vegetarian", "quick", "budget" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 20,
                Difficulty = "Einfach",
                Emoji = "🍳",
                DefaultServings = 2,
                Nutrition = new() { Calories = 510, Protein = 22, Carbs = 58, Fat = 20, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Spätzle oder Nockerl frisch", SearchTerm = "Spätzle", Amount = 400, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 4, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Butter", SearchTerm = "Teebutter", Amount = 30, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Schnittlauch", SearchTerm = "Schnittlauch", Amount = 1, Unit = "Bund", Category = "Gemüse & Obst" },
                    new() { Name = "Häuptelsalat", SearchTerm = "Häuptelsalat", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // --- 11. Spaghetti Bolognese ---
            new Meal
            {
                Id = "spaghetti-bolognese",
                Name = "Spaghetti Bolognese (Ragù alla Bolognese)",
                Description = "Langsam geköchelte Fleischsauce mit sonnengereiften Tomaten, Kräutern und frisch geriebenem Grana Padano.",
                Category = "Pasta & Pizza",
                Tags = new() { "pasta", "meat", "classic" },
                Allergens = new() { "gluten", "lactose" },
                PrepTimeMinutes = 40,
                Difficulty = "Einfach",
                Emoji = "🍝",
                DefaultServings = 2,
                Nutrition = new() { Calories = 590, Protein = 32, Carbs = 74, Fat = 17, Fiber = 5 },
                Ingredients = new()
                {
                    new() { Name = "Spaghetti No. 5", SearchTerm = "Spaghetti", Amount = 300, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Rindsfaschiertes", SearchTerm = "Rinderfaschiertes", Amount = 350, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Polpa Tomaten Dose", SearchTerm = "Polpa Tomaten", Amount = 400, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Grana Padano", SearchTerm = "Grana Padano", Amount = 80, Unit = "g", Category = "Milchprodukte & Eier" }
                }
            },

            // --- 12. Tomaten-Pasta Mozzarella ---
            new Meal
            {
                Id = "tomaten-pasta-mozzarella",
                Name = "Cremige Tomaten-Penne mit Mozzarella & Basilikum",
                Description = "Mediterraner Pasta-Traum in 20 Minuten: Süße Kirschtomaten, cremiger Mozzarella und frisches Basilikum.",
                Category = "Pasta & Pizza",
                Tags = new() { "pasta", "vegetarian", "quick" },
                Allergens = new() { "gluten", "lactose" },
                PrepTimeMinutes = 20,
                Difficulty = "Einfach",
                Emoji = "🍝",
                DefaultServings = 2,
                Nutrition = new() { Calories = 530, Protein = 21, Carbs = 68, Fat = 18, Fiber = 4 },
                Ingredients = new()
                {
                    new() { Name = "Penne Rigate", SearchTerm = "Penne", Amount = 300, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Kirschtomaten", SearchTerm = "Rispentomaten", Amount = 250, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Mozzarella", SearchTerm = "Mozzarella", Amount = 150, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Frisches Basilikum", SearchTerm = "Basilikum", Amount = 1, Unit = "Topf", Category = "Gemüse & Obst" }
                }
            },

            // --- 13. Lachsfilet auf Ofengemüse ---
            new Meal
            {
                Id = "lachs-ofengemuese",
                Name = "Lachsfilet auf buntem Ofengemüse",
                Description = "Saftig gebratenes Lachsfilet auf mediterranem Zucchini-Paprika-Gemüse mit Rosmarinkartoffeln. Glutenfrei & Laktosefrei!",
                Category = "Pfanne & Wok",
                Tags = new() { "fish", "quick", "healthy" },
                Allergens = new() { "fish" },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🐟",
                DefaultServings = 2,
                Nutrition = new() { Calories = 480, Protein = 36, Carbs = 22, Fat = 26, Fiber = 5 },
                Ingredients = new()
                {
                    new() { Name = "Lachsfilet frisch", SearchTerm = "Lachsfilet", Amount = 300, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Zucchini", SearchTerm = "Zucchini", Amount = 2, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Paprika bunt", SearchTerm = "Paprika", Amount = 2, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Erdäpfel festkochend", SearchTerm = "Erdäpfel", Amount = 400, Unit = "g", Category = "Gemüse & Obst" }
                }
            },

            // --- 14. Spinat-Feta-Frittata ---
            new Meal
            {
                Id = "spinat-feta-frittata",
                Name = "Ofen-Frittata mit Baby-Spinat & Feta",
                Description = "Leichtes Pfannengericht aus Bio-Eiern, frischem Blattspinat, Kirschtomaten und zerbröckeltem griechischem Feta. Glutenfrei!",
                Category = "Pfanne & Wok",
                Tags = new() { "vegetarian", "quick", "healthy" },
                Allergens = new() { "egg", "lactose" },
                PrepTimeMinutes = 20,
                Difficulty = "Einfach",
                Emoji = "🍳",
                DefaultServings = 2,
                Nutrition = new() { Calories = 410, Protein = 24, Carbs = 12, Fat = 29, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 5, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Frischer Blattspinat", SearchTerm = "Blattspinat", Amount = 150, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Feta Schafskäse", SearchTerm = "Feta", Amount = 150, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Kirschtomaten", SearchTerm = "Rispentomaten", Amount = 150, Unit = "g", Category = "Gemüse & Obst" }
                }
            },

            // --- 15. Hühnercurry mit Gemüse ---
            new Meal
            {
                Id = "huehnercurry-gemuese",
                Name = "Cremiges Hühnercurry mit Gemüse & Basmatireis",
                Description = "Zarte Hühnerbruststücke in feiner Kokosmilch-Sauce mit Zucchini, Karotten und duftendem Reis. Glutenfrei & Laktosefrei!",
                Category = "Pfanne & Wok",
                Tags = new() { "meat", "quick", "classic" },
                Allergens = new() { },
                PrepTimeMinutes = 30,
                Difficulty = "Einfach",
                Emoji = "🍛",
                DefaultServings = 2,
                Nutrition = new() { Calories = 520, Protein = 35, Carbs = 58, Fat = 14, Fiber = 5 },
                Ingredients = new()
                {
                    new() { Name = "Hühnerbrustfilet", SearchTerm = "Hühnerbrust", Amount = 350, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Kokosmilch Dose", SearchTerm = "Kokosmilch", Amount = 400, Unit = "ml", Category = "Vorratsschrank" },
                    new() { Name = "Basmatireis", SearchTerm = "Basmatireis", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Paprika bunt", SearchTerm = "Paprika", Amount = 2, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // ==========================================
            // VEGAN RECIPES (100% REIN PFLANZLICH)
            // ==========================================

            // --- 16. Rotes Linsen Dal (VEGAN) ---
            new Meal
            {
                Id = "rote-linsen-dal",
                Name = "Cremiges Rotes Linsen Dal mit Spinat & Reis",
                Description = "100% pflanzlich, proteinreich & glutenfrei: Rote Linsen in cremiger Kokosmilch mit Ingwer, Kurkuma und frischem Blattspinat.",
                Category = "Pfanne & Wok",
                Tags = new() { "vegan", "budget", "quick", "healthy" },
                Allergens = new() { },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🍛",
                DefaultServings = 2,
                Nutrition = new() { Calories = 460, Protein = 20, Carbs = 64, Fat = 11, Fiber = 9 },
                Ingredients = new()
                {
                    new() { Name = "Rote Linsen", SearchTerm = "Rote Linsen", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Kokosmilch Dose", SearchTerm = "Kokosmilch", Amount = 400, Unit = "ml", Category = "Vorratsschrank" },
                    new() { Name = "Basmatireis", SearchTerm = "Basmatireis", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Baby-Blattspinat", SearchTerm = "Blattspinat", Amount = 150, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Polpa Tomaten", SearchTerm = "Polpa Tomaten", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Frischer Ingwer", SearchTerm = "Ingwer", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // --- 17. Wiener Erdäpfelgulasch klassisch vegan (VEGAN) ---
            new Meal
            {
                Id = "wiener-erdaepfelgulasch-vegan",
                Name = "Wiener Erdäpfelgulasch klassisch (Vegan)",
                Description = "Traditionelles Wiener Wirtshausrezept rein pflanzlich: Sämig eingekochte Erdäpfel mit edelsüßem Paprika, Kümmel und Essiggurkerln.",
                Category = "Suppe & Eintopf",
                Tags = new() { "austrian", "vegan", "budget", "classic" },
                Allergens = new() { },
                PrepTimeMinutes = 35,
                Difficulty = "Einfach",
                Emoji = "🍲",
                DefaultServings = 2,
                Nutrition = new() { Calories = 420, Protein = 11, Carbs = 68, Fat = 10, Fiber = 8 },
                Ingredients = new()
                {
                    new() { Name = "Erdäpfel vorwiegend festkochend", SearchTerm = "Erdäpfel", Amount = 800, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Zwiebeln", SearchTerm = "Zwiebel", Amount = 400, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Paprikapulver edelsüß", SearchTerm = "Paprikapulver", Amount = 35, Unit = "g", Category = "Gewürze" },
                    new() { Name = "Knoblauch", SearchTerm = "Knoblauch", Amount = 3, Unit = "Zehen", Category = "Gemüse & Obst" },
                    new() { Name = "Essiggurken", SearchTerm = "Essiggurken", Amount = 1, Unit = "Glas", Category = "Vorratsschrank" }
                }
            },

            // --- 18. Steirische Kürbiscremesuppe (VEGAN) ---
            new Meal
            {
                Id = "kuerbiscremesuppe-vegan",
                Name = "Steirische Kürbiscremesuppe mit Kürbiskernöl",
                Description = "Aromatischer Hokkaido-Kürbis mit Kokosmilch, Ingwer und gerösteten steirischen Kürbiskernen verfeinert. 100% vegan & glutenfrei.",
                Category = "Suppe & Eintopf",
                Tags = new() { "austrian", "vegan", "quick", "classic" },
                Allergens = new() { },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🥣",
                DefaultServings = 2,
                Nutrition = new() { Calories = 380, Protein = 10, Carbs = 34, Fat = 22, Fiber = 6 },
                Ingredients = new()
                {
                    new() { Name = "Hokkaido Kürbis", SearchTerm = "Kürbis", Amount = 600, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Kokosmilch", SearchTerm = "Kokosmilch", Amount = 250, Unit = "ml", Category = "Vorratsschrank" },
                    new() { Name = "Steirisches Kürbiskernöl", SearchTerm = "Kürbiskernöl", Amount = 30, Unit = "ml", Category = "Vorratsschrank" },
                    new() { Name = "Kürbiskerne", SearchTerm = "Kürbiskerne", Amount = 40, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Gemüsebrühe", SearchTerm = "Gemüsebrühe", Amount = 1, Unit = "Glas", Category = "Vorratsschrank" }
                }
            },

            // --- 19. Karamellisierte Wiener Krautfleckerl (VEGAN) ---
            new Meal
            {
                Id = "krautfleckerl-vegan",
                Name = "Karamellisierte Wiener Krautfleckerl",
                Description = "Der urösterreichische Wirtshausklassiker: Frisches Weißkraut mit Zucker langsam braun karamellisiert, mit Fleckerln und Kümmel vollendet.",
                Category = "Klassiker",
                Tags = new() { "austrian", "vegan", "budget", "classic" },
                Allergens = new() { "gluten" },
                PrepTimeMinutes = 35,
                Difficulty = "Einfach",
                Emoji = "🍲",
                DefaultServings = 2,
                Nutrition = new() { Calories = 490, Protein = 15, Carbs = 76, Fat = 12, Fiber = 7 },
                Ingredients = new()
                {
                    new() { Name = "Österreichische Fleckerl Nudeln", SearchTerm = "Fleckerl", Amount = 300, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Weißkraut frischer Krautkopf", SearchTerm = "Weißkraut", Amount = 600, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Zwiebeln", SearchTerm = "Zwiebel", Amount = 2, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Kristallzucker zum Karamellisieren", SearchTerm = "Zucker", Amount = 30, Unit = "g", Category = "Vorratsschrank", IsPantryStaple = true }
                }
            },

            // --- 20. Bunter Gemüse-Wok mit Räuchertofu (VEGAN) ---
            new Meal
            {
                Id = "gemuese-wok-tofu",
                Name = "Bunter Gemüse-Wok mit Räuchertofu & Jasminreis",
                Description = "Knackiger Wok-Mix aus Brokkoli, Paprika, Karotten und krossem Räuchertofu in feiner Soja-Sesam-Sauce. Laktosefrei & eifrei.",
                Category = "Pfanne & Wok",
                Tags = new() { "vegan", "quick", "healthy" },
                Allergens = new() { "gluten" },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🥢",
                DefaultServings = 2,
                Nutrition = new() { Calories = 470, Protein = 26, Carbs = 58, Fat = 14, Fiber = 7 },
                Ingredients = new()
                {
                    new() { Name = "Räuchertofu bio", SearchTerm = "Räuchertofu", Amount = 300, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Brokkoli frisch", SearchTerm = "Brokkoli", Amount = 300, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Paprika bunt", SearchTerm = "Paprika", Amount = 2, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Jasminreis", SearchTerm = "Basmatireis", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Sojasauce", SearchTerm = "Sojasauce", Amount = 40, Unit = "ml", Category = "Vorratsschrank" }
                }
            },

            // --- 21. Chili sin Carne (VEGAN) ---
            new Meal
            {
                Id = "chili-sin-carne",
                Name = "Chili sin Carne mit schwarzen Bohnen & Mais",
                Description = "Deftig-würziger veganer Bohneneintopf mit Mais, sonnigen Tomaten, Kreuzkümmel und knusprigen Tortilla-Chips. Glutenfrei & laktosefrei.",
                Category = "Suppe & Eintopf",
                Tags = new() { "vegan", "budget", "quick" },
                Allergens = new() { },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🍲",
                DefaultServings = 2,
                Nutrition = new() { Calories = 450, Protein = 22, Carbs = 66, Fat = 9, Fiber = 14 },
                Ingredients = new()
                {
                    new() { Name = "Kidneybohnen Dose", SearchTerm = "Kidneybohnen", Amount = 1, Unit = "Dose", Category = "Vorratsschrank" },
                    new() { Name = "Schwarze Bohnen Dose", SearchTerm = "Schwarze Bohnen", Amount = 1, Unit = "Dose", Category = "Vorratsschrank" },
                    new() { Name = "Mais Dose", SearchTerm = "Mais", Amount = 1, Unit = "Dose", Category = "Vorratsschrank" },
                    new() { Name = "Polpa Tomaten Dose", SearchTerm = "Polpa Tomaten", Amount = 400, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Zwiebel & Knoblauch", SearchTerm = "Zwiebel", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // --- 22. Mediterrane Kichererbsenpfanne (VEGAN) ---
            new Meal
            {
                Id = "kichererbsen-curry-vegan",
                Name = "Kichererbsen-Curry mit Süßkartoffeln & Spinat",
                Description = "Voller pflanzlicher Nährstoffe: Cremiges Curry aus Kichererbsen, zarter Süßkartoffel und Blattspinat in sämiger Kokossauce. Glutenfrei!",
                Category = "Pfanne & Wok",
                Tags = new() { "vegan", "healthy", "budget" },
                Allergens = new() { },
                PrepTimeMinutes = 30,
                Difficulty = "Einfach",
                Emoji = "🍛",
                DefaultServings = 2,
                Nutrition = new() { Calories = 490, Protein = 18, Carbs = 68, Fat = 15, Fiber = 11 },
                Ingredients = new()
                {
                    new() { Name = "Kichererbsen Dose", SearchTerm = "Kichererbsen", Amount = 1, Unit = "Dose", Category = "Vorratsschrank" },
                    new() { Name = "Süßkartoffeln", SearchTerm = "Süßkartoffel", Amount = 400, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Kokosmilch Dose", SearchTerm = "Kokosmilch", Amount = 400, Unit = "ml", Category = "Vorratsschrank" },
                    new() { Name = "Baby-Blattspinat", SearchTerm = "Blattspinat", Amount = 150, Unit = "g", Category = "Gemüse & Obst" }
                }
            },

            // --- 23. Penne all'Arrabbiata (VEGAN) ---
            new Meal
            {
                Id = "penne-arrabbiata-vegan",
                Name = "Penne all'Arrabbiata mit Rucola & Oliven",
                Description = "Feurig-italienische Pasta mit scharfem Chili, aromatischem Knoblauch, schwarzen Oliven und frischem Rucola. Rein pflanzlich & laktosefrei.",
                Category = "Pasta & Pizza",
                Tags = new() { "pasta", "vegan", "quick", "budget" },
                Allergens = new() { "gluten" },
                PrepTimeMinutes = 20,
                Difficulty = "Einfach",
                Emoji = "🍝",
                DefaultServings = 2,
                Nutrition = new() { Calories = 480, Protein = 15, Carbs = 76, Fat = 12, Fiber = 5 },
                Ingredients = new()
                {
                    new() { Name = "Penne Rigate", SearchTerm = "Penne", Amount = 300, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Polpa Tomaten Dose", SearchTerm = "Polpa Tomaten", Amount = 400, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Knoblauch & Chili", SearchTerm = "Knoblauch", Amount = 3, Unit = "Zehen", Category = "Gemüse & Obst" },
                    new() { Name = "Schwarze Oliven", SearchTerm = "Oliven", Amount = 80, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Rucola", SearchTerm = "Rucola", Amount = 100, Unit = "g", Category = "Gemüse & Obst" }
                }
            },

            // --- 24. Kräftige Rindssuppe mit Kaspressknödeln ---
            new Meal
            {
                Id = "kaspressknoedel-suppe",
                Name = "Kräftige Rindssuppe mit Tiroler Kaspressknödeln",
                Description = "Goldbraun in Butter herausgebackene Knödel mit würzigem Bergkäse und Graukäse in heißer Rindssuppe mit frischem Schnittlauch.",
                Category = "Suppe & Eintopf",
                Tags = new() { "austrian", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 35,
                Difficulty = "Mittel",
                Emoji = "🥣",
                DefaultServings = 2,
                Nutrition = new() { Calories = 490, Protein = 26, Carbs = 38, Fat = 26, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Knödelbrot", SearchTerm = "Knödelbrot", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Würziger Bergkäse gerieben", SearchTerm = "Bergkäse", Amount = 150, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Milch", SearchTerm = "Milch", Amount = 120, Unit = "ml", Category = "Milchprodukte & Eier" },
                    new() { Name = "Rindssuppe / Bouillon", SearchTerm = "Rindssuppe", Amount = 1, Unit = "Glas", Category = "Vorratsschrank" },
                    new() { Name = "Frischer Schnittlauch", SearchTerm = "Schnittlauch", Amount = 1, Unit = "Bund", Category = "Gemüse & Obst" }
                }
            },

            // --- 25. Wiener Eiernockerl mit grünem Salat ---
            new Meal
            {
                Id = "eiernockerl-salat",
                Name = "Wiener Eiernockerl mit Schnittlauch & Häuptelsalat",
                Description = "Frisch gehobelte Nockerl direkt aus dem kochenden Wasser in schäumender Butter mit verquirlten Eiern gestockt.",
                Category = "Klassiker",
                Tags = new() { "austrian", "vegetarian", "quick", "budget" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 20,
                Difficulty = "Einfach",
                Emoji = "🍳",
                DefaultServings = 2,
                Nutrition = new() { Calories = 520, Protein = 22, Carbs = 58, Fat = 22, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Mehl glatt", SearchTerm = "Mehl", Amount = 250, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Eier für Teig & Pfanne", SearchTerm = "Eier", Amount = 4, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Butter", SearchTerm = "Teebutter", Amount = 40, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Häuptelsalat frisch", SearchTerm = "Salat", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Frischer Schnittlauch", SearchTerm = "Schnittlauch", Amount = 1, Unit = "Bund", Category = "Gemüse & Obst" }
                }
            },

            // --- 26. Gebackener Emmentaler mit Preiselbeeren ---
            new Meal
            {
                Id = "gebackener-emmentaler",
                Name = "Gebackener Emmentaler mit Preiselbeeren & Sauce Tartare",
                Description = "Kross panierte Käseschnitten mit flüssig-cremigem Kern, serviert mit fruchtigen Wildpreiselbeeren und Petersilerdäpfeln.",
                Category = "Klassiker",
                Tags = new() { "austrian", "vegetarian", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🧀",
                DefaultServings = 2,
                Nutrition = new() { Calories = 680, Protein = 34, Carbs = 44, Fat = 38, Fiber = 2 },
                Ingredients = new()
                {
                    new() { Name = "Emmentaler Käse am Stück", SearchTerm = "Emmentaler", Amount = 300, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Semmelbrösel", SearchTerm = "Semmelbrösel", Amount = 120, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Eier", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Wildpreiselbeeren", SearchTerm = "Preiselbeeren", Amount = 150, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Erdäpfel festkochend", SearchTerm = "Erdäpfel", Amount = 400, Unit = "g", Category = "Gemüse & Obst" }
                }
            },

            // --- 27. Gefüllte Paprika mit Reis in Tomatensauce ---
            new Meal
            {
                Id = "gefuellte-paprika",
                Name = "Gefüllte Paprika in fruchtiger Tomatensauce",
                Description = "Klassische gelbe und rote Paprikaschoten mit saftig gewürztem Faschierten und Reis, langsam in Tomatensauce geschmort.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "classic" },
                Allergens = new() { "gluten", "egg" },
                PrepTimeMinutes = 45,
                Difficulty = "Mittel",
                Emoji = "🫑",
                DefaultServings = 2,
                Nutrition = new() { Calories = 560, Protein = 36, Carbs = 54, Fat = 22, Fiber = 6 },
                Ingredients = new()
                {
                    new() { Name = "Gemischtes Faschiertes", SearchTerm = "Faschiertes", Amount = 350, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Paprika groß bunt", SearchTerm = "Paprika", Amount = 4, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Langkornreis", SearchTerm = "Basmatireis", Amount = 150, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Passierte Tomaten", SearchTerm = "Passierte Tomaten", Amount = 500, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Zwiebel & Knoblauch", SearchTerm = "Zwiebel", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // --- 28. Szegediner Krautfleisch mit Salzerdäpfeln ---
            new Meal
            {
                Id = "szegediner-gulasch",
                Name = "Szegediner Krautfleisch mit Sauerrahm & Salzerdäpfeln",
                Description = "Zart geschmortes Schweinefleisch mit herb-saurem Sauerkraut, edelsüßem Paprika, Kümmel und cremigem Sauerrahm.",
                Category = "Klassiker",
                Tags = new() { "austrian", "meat", "classic" },
                Allergens = new() { "lactose" },
                PrepTimeMinutes = 55,
                Difficulty = "Mittel",
                Emoji = "🍲",
                DefaultServings = 2,
                Nutrition = new() { Calories = 540, Protein = 40, Carbs = 34, Fat = 26, Fiber = 8 },
                Ingredients = new()
                {
                    new() { Name = "Schweineschulter gewürfelt", SearchTerm = "Schweinefleisch", Amount = 400, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Sauerkraut mild", SearchTerm = "Sauerkraut", Amount = 500, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Sauerrahm", SearchTerm = "Sauerrahm", Amount = 150, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Erdäpfel für Salzkartoffeln", SearchTerm = "Erdäpfel", Amount = 500, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Paprikapulver edelsüß", SearchTerm = "Paprikapulver", Amount = 30, Unit = "g", Category = "Gewürze" }
                }
            },

            // --- 29. Gebratenes Forellenfilet mit Mandelbutter ---
            new Meal
            {
                Id = "lachsforelle-mandelbutter",
                Name = "Gebratenes Forellenfilet mit Mandelbutter & Petersilerdäpfeln",
                Description = "Heimischer Alpen-Fisch auf der Hautseite kross gebraten, nappiert mit nussiger gebräunter Mandelbutter und Zitrone.",
                Category = "Fisch & Meeresfrüchte",
                Tags = new() { "austrian", "fish", "healthy" },
                Allergens = new() { "fish", "nuts", "lactose" },
                PrepTimeMinutes = 25,
                Difficulty = "Einfach",
                Emoji = "🐟",
                DefaultServings = 2,
                Nutrition = new() { Calories = 510, Protein = 38, Carbs = 32, Fat = 24, Fiber = 3 },
                Ingredients = new()
                {
                    new() { Name = "Forellenfilet frisch", SearchTerm = "Forellenfilet", Amount = 350, Unit = "g", Category = "Fleisch & Fisch" },
                    new() { Name = "Mandelblättchen", SearchTerm = "Mandeln", Amount = 40, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Butter", SearchTerm = "Teebutter", Amount = 40, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Erdäpfel festkochend", SearchTerm = "Erdäpfel", Amount = 400, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Zitrone & Petersilie", SearchTerm = "Zitrone", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // --- 30. Schwammerlgulasch mit Semmelknödel ---
            new Meal
            {
                Id = "schwammerlgulasch",
                Name = "Steirisches Schwammerlgulasch mit Semmelknödeln",
                Description = "Waldpilze und Champignons in sämiger Rahmsauce mit Majoran und Petersilie, serviert mit selbstgemachten Semmelknödeln.",
                Category = "Klassiker",
                Tags = new() { "austrian", "vegetarian", "classic" },
                Allergens = new() { "gluten", "egg", "lactose" },
                PrepTimeMinutes = 40,
                Difficulty = "Einfach",
                Emoji = "🍄",
                DefaultServings = 2,
                Nutrition = new() { Calories = 490, Protein = 18, Carbs = 62, Fat = 18, Fiber = 6 },
                Ingredients = new()
                {
                    new() { Name = "Champignons & Waldpilze", SearchTerm = "Champignons", Amount = 450, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Sauerrahm oder Obers", SearchTerm = "Sauerrahm", Amount = 200, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Knödelbrot", SearchTerm = "Knödelbrot", Amount = 200, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Eier & Milch", SearchTerm = "Eier", Amount = 2, Unit = "Stk", Category = "Milchprodukte & Eier" },
                    new() { Name = "Zwiebel & Petersilie", SearchTerm = "Zwiebel", Amount = 1, Unit = "Stk", Category = "Gemüse & Obst" }
                }
            },

            // --- 31. Mediterranes Ofengemüse mit Rosmarin-Erdäpfeln & Feta ---
            new Meal
            {
                Id = "ofengemuese-feta",
                Name = "Mediterranes Blech-Ofengemüse mit Feta & Rosmarin",
                Description = "Knusprig im Ofen geröstete Erdäpfelspalten, Zucchini, Paprika und rote Zwiebeln mit cremig geschmolzenem Feta und Olivenöl.",
                Category = "Ofengericht",
                Tags = new() { "vegetarian", "quick", "healthy" },
                Allergens = new() { "lactose" },
                PrepTimeMinutes = 30,
                Difficulty = "Einfach",
                Emoji = "🥔",
                DefaultServings = 2,
                Nutrition = new() { Calories = 460, Protein = 18, Carbs = 48, Fat = 21, Fiber = 7 },
                Ingredients = new()
                {
                    new() { Name = "Erdäpfel festkochend", SearchTerm = "Erdäpfel", Amount = 500, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Feta Schafskäse", SearchTerm = "Feta", Amount = 200, Unit = "g", Category = "Milchprodukte & Eier" },
                    new() { Name = "Zucchini & Paprika", SearchTerm = "Zucchini", Amount = 2, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Rote Zwiebeln", SearchTerm = "Zwiebel", Amount = 2, Unit = "Stk", Category = "Gemüse & Obst" },
                    new() { Name = "Olivenöl bio", SearchTerm = "Olivenöl", Amount = 30, Unit = "ml", Category = "Vorratsschrank", IsPantryStaple = true }
                }
            },

            // --- 32. Spaghetti Aglio, Olio e Peperoncino (VEGAN) ---
            new Meal
            {
                Id = "spaghetti-aglio-olio-vegan",
                Name = "Spaghetti Aglio, Olio e Peperoncino mit Kirschtomaten",
                Description = "Der weltberühmte italienische Klassiker: Al dente Pasta sanft geschwenkt in bestem Olivenöl, goldgelbem Knoblauch, Peperoncino und frischer Petersilie.",
                Category = "Pasta & Pizza",
                Tags = new() { "pasta", "vegan", "quick", "budget" },
                Allergens = new() { "gluten" },
                PrepTimeMinutes = 15,
                Difficulty = "Einfach",
                Emoji = "🍝",
                DefaultServings = 2,
                Nutrition = new() { Calories = 470, Protein = 14, Carbs = 72, Fat = 14, Fiber = 4 },
                Ingredients = new()
                {
                    new() { Name = "Spaghetti Pasta", SearchTerm = "Spaghetti", Amount = 300, Unit = "g", Category = "Vorratsschrank" },
                    new() { Name = "Olivenöl extra vergine", SearchTerm = "Olivenöl", Amount = 40, Unit = "ml", Category = "Vorratsschrank", IsPantryStaple = true },
                    new() { Name = "Knoblauchzehen & Peperoncino", SearchTerm = "Knoblauch", Amount = 4, Unit = "Zehen", Category = "Gemüse & Obst" },
                    new() { Name = "Kirschtomaten", SearchTerm = "Rispentomaten", Amount = 200, Unit = "g", Category = "Gemüse & Obst" },
                    new() { Name = "Frische Petersilie", SearchTerm = "Petersilie", Amount = 1, Unit = "Bund", Category = "Gemüse & Obst" }
                }
            }
        };
    }
}
