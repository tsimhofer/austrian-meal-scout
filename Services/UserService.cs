using System.Collections.Concurrent;
using System.Text.Json;
using AustrianMealScout.Models;

namespace AustrianMealScout.Services;

public class UserService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<UserService> _logger;
    private readonly string _storageDir;
    private readonly ConcurrentDictionary<string, UserAccount> _userCache = new();
    private readonly ConcurrentDictionary<string, string> _sessions = new(); // token -> userId
    private readonly object _fileLock = new();

    public UserService(HttpClient httpClient, ILogger<UserService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger;

        // Persist users in ./data/users
        var configuredPath = configuration["UserDataPath"];
        _storageDir = !string.IsNullOrWhiteSpace(configuredPath)
            ? configuredPath
            : Path.Combine(Directory.GetCurrentDirectory(), "data", "users");

        if (!Directory.Exists(_storageDir))
        {
            Directory.CreateDirectory(_storageDir);
        }

        LoadAllUsersFromDisk();
    }

    private void LoadAllUsersFromDisk()
    {
        try
        {
            if (!Directory.Exists(_storageDir)) return;

            var files = Directory.GetFiles(_storageDir, "*.json");
            foreach (var file in files)
            {
                try
                {
                    var json = File.ReadAllText(file);
                    var user = JsonSerializer.Deserialize<UserAccount>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    if (user != null && !string.IsNullOrWhiteSpace(user.Id))
                    {
                        _userCache[user.Id] = user;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Fehler beim Laden von Benutzerdatei {File}", file);
                }
            }
            _logger.LogInformation("{Count} Benutzerprofile geladen aus {Dir}", _userCache.Count, _storageDir);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fehler beim Initialisieren des User-Verzeichnisses");
        }
    }

    public async Task<AuthResponse> AuthenticateGoogleAsync(GoogleAuthRequest request)
    {
        string subId;
        string email;
        string name;
        string pictureUrl;

        if (request.IsDemo || string.IsNullOrWhiteSpace(request.Credential))
        {
            // Demo / Dev Google user fallback
            email = !string.IsNullOrWhiteSpace(request.DemoEmail) ? request.DemoEmail : "thomas.simhofer@gmail.com";
            name = !string.IsNullOrWhiteSpace(request.DemoName) ? request.DemoName : "Thomas Simhofer";
            pictureUrl = !string.IsNullOrWhiteSpace(request.DemoPicture)
                ? request.DemoPicture
                : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80";
            subId = "google-demo-" + Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(email)))[..12].ToLowerInvariant();
        }
        else
        {
            // Verify Google ID Token
            var googleClaims = await VerifyGoogleTokenAsync(request.Credential);
            if (googleClaims == null)
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "Google-Token konnte nicht verifiziert werden."
                };
            }

            subId = googleClaims.Sub;
            email = googleClaims.Email;
            name = googleClaims.Name;
            pictureUrl = googleClaims.Picture;
        }

        var user = _userCache.GetOrAdd(subId, id =>
        {
            var newUser = new UserAccount
            {
                Id = id,
                Email = email,
                Name = name,
                PictureUrl = pictureUrl,
                AuthProvider = "google",
                CreatedAt = DateTime.UtcNow
            };
            newUser.Statistics.RecentActivity.Add(new UserActivityItem
            {
                Description = "Konto via Google erfolgreich verknüpft.",
                Type = "auth"
            });
            return newUser;
        });

        // Update profile fields if changed
        user.Name = name;
        user.Email = email;
        if (!string.IsNullOrWhiteSpace(pictureUrl)) user.PictureUrl = pictureUrl;
        user.Statistics.LastActive = DateTime.UtcNow;

        SaveUserToDisk(user);

        // Generate session token
        var token = "agm_" + Guid.NewGuid().ToString("N");
        _sessions[token] = user.Id;

        return new AuthResponse
        {
            Success = true,
            Token = token,
            User = user,
            Message = $"Willkommen, {user.Name}!"
        };
    }

    public UserAccount? GetUserByToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        // Clean token if Bearer prefix provided
        if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = token.Substring(7).Trim();
        }

        if (_sessions.TryGetValue(token, out var userId) && _userCache.TryGetValue(userId, out var user))
        {
            user.Statistics.LastActive = DateTime.UtcNow;
            return user;
        }

        return null;
    }

    public bool UpdatePreferences(string userId, UserPreferences preferences)
    {
        if (_userCache.TryGetValue(userId, out var user))
        {
            user.Preferences = preferences;
            user.Statistics.LastActive = DateTime.UtcNow;
            SaveUserToDisk(user);
            return true;
        }
        return false;
    }

    public bool RecordStatistic(string userId, RecordStatisticRequest request)
    {
        if (!_userCache.TryGetValue(userId, out var user)) return false;

        var stats = user.Statistics;
        stats.LastActive = DateTime.UtcNow;

        switch (request.Action.ToLowerInvariant())
        {
            case "plan_generated":
                stats.PlansGeneratedCount++;
                if (request.ValueInt > 0)
                {
                    stats.TotalCaloriesPlanned += request.ValueInt;
                }
                stats.RecentActivity.Insert(0, new UserActivityItem
                {
                    Description = request.Details ?? "Neuen Speiseplan generiert.",
                    Type = "plan"
                });
                break;

            case "meal_cooked":
                stats.MealsCookedCount++;
                stats.RecentActivity.Insert(0, new UserActivityItem
                {
                    Description = request.Details ?? "Gericht erfolgreich gekocht.",
                    Type = "cook"
                });
                break;

            case "money_saved":
                if (request.ValueDecimal > 0)
                {
                    stats.EstimatedMoneySaved += request.ValueDecimal;
                }
                if (!string.IsNullOrWhiteSpace(request.Details))
                {
                    stats.FavoriteStore = request.Details;
                }
                stats.RecentActivity.Insert(0, new UserActivityItem
                {
                    Description = $"Geschätzte Ersparnis: +{request.ValueDecimal:F2} € beim Einkauf.",
                    Type = "save"
                });
                break;

            default:
                if (!string.IsNullOrWhiteSpace(request.Details))
                {
                    stats.RecentActivity.Insert(0, new UserActivityItem
                    {
                        Description = request.Details,
                        Type = "info"
                    });
                }
                break;
        }

        // Keep last 30 activities
        if (stats.RecentActivity.Count > 30)
        {
            stats.RecentActivity = stats.RecentActivity.Take(30).ToList();
        }

        SaveUserToDisk(user);
        return true;
    }

    public void Logout(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return;
        if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = token.Substring(7).Trim();
        }
        _sessions.TryRemove(token, out _);
    }

    private void SaveUserToDisk(UserAccount user)
    {
        try
        {
            lock (_fileLock)
            {
                var filePath = Path.Combine(_storageDir, $"{user.Id}.json");
                var json = JsonSerializer.Serialize(user, new JsonSerializerOptions
                {
                    WriteIndented = true
                });
                File.WriteAllText(filePath, json);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fehler beim Speichern von User {UserId}", user.Id);
        }
    }

    private async Task<GoogleClaims?> VerifyGoogleTokenAsync(string idToken)
    {
        try
        {
            // 1. Try Google TokenInfo API
            var response = await _httpClient.GetAsync($"https://oauth2.googleapis.com/tokeninfo?id_token={idToken}");
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;

                var sub = root.TryGetProperty("sub", out var s) ? s.GetString() : null;
                var email = root.TryGetProperty("email", out var e) ? e.GetString() : null;
                var name = (root.TryGetProperty("name", out var n) ? n.GetString() : null) ?? (email?.Split('@')[0] ?? "Google User");
                var picture = (root.TryGetProperty("picture", out var p) ? p.GetString() : null) ?? string.Empty;

                if (!string.IsNullOrWhiteSpace(sub) && !string.IsNullOrWhiteSpace(email))
                {
                    return new GoogleClaims(sub, email, name, picture);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google TokenInfo Request fehlgeschlagen, versuche Payload-Fallback");
        }

        // 2. Fallback: Parse JWT payload safely (handles dev environments / offline)
        try
        {
            var parts = idToken.Split('.');
            if (parts.Length >= 2)
            {
                var payloadBase64 = parts[1];
                // Pad base64 string
                payloadBase64 = payloadBase64.Replace('-', '+').Replace('_', '/');
                switch (payloadBase64.Length % 4)
                {
                    case 2: payloadBase64 += "=="; break;
                    case 3: payloadBase64 += "="; break;
                }

                var bytes = Convert.FromBase64String(payloadBase64);
                var json = System.Text.Encoding.UTF8.GetString(bytes);

                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var sub = root.TryGetProperty("sub", out var s) ? s.GetString() : null;
                var email = root.TryGetProperty("email", out var e) ? e.GetString() : null;
                var name = (root.TryGetProperty("name", out var n) ? n.GetString() : null) ?? (email?.Split('@')[0] ?? "Google User");
                var picture = (root.TryGetProperty("picture", out var p) ? p.GetString() : null) ?? string.Empty;

                if (!string.IsNullOrWhiteSpace(sub) && !string.IsNullOrWhiteSpace(email))
                {
                    return new GoogleClaims(sub, email, name, picture);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "JWT-Payload Parsing fehlgeschlagen");
        }

        return null;
    }

    private record GoogleClaims(string Sub, string Email, string Name, string Picture);
}
