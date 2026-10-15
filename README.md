# Mahlzeit Österreich 🇦🇹

> **Leichtgewichtiger Kalender-Menüplaner & Supermarkt-Scout für Österreich**  
> Würfelt abwechslungsreiche Mahlzeiten für 1 bis 4 Wochen im Kalenderformat, berechnet exakte Nährwerte und scoutet in Echtzeit die APIs von **SPAR**, **BILLA** und den **HOFER-Discounter-Index**, um die günstigste Einkaufsliste zusammenzustellen.

---

## ✨ Features

- 📅 **Kalender-SPA & Multi-Wochen-Vorhersage**:
  - Wähle einen Planungshorizont von **1 Woche**, **2 Wochen**, **3 Wochen** oder **4 Wochen (Monatsplan)**.
  - Kalenderwochen-Navigation (**KW 42**, **KW 43**, etc.) mit exakten Datumsangaben (*Mo 19. Okt*, *Di 20. Okt*, ...).
  - Umschaltung zwischen **7-Tage-Wochenkalender** und **Multi-Wochen-Monatsübersicht**.
  - Intelligente Rotation ohne Wiederholungen über 32+ authentische österreichische Rezepte.
- 🛒 **Echtzeit-Supermarkt-Scout (Österreich)**:
  - **SPAR / Interspar**: Live-Abfrage via offizieller REST-API (`search-spar.spar-ics.com`) mit Preisvergleich in Euro.
  - **BILLA / REWE**: Live-Abfrage via Product Discovery API mit In-Memory-Kategoriecaching (2 Stunden).
  - **HOFER**: Discounter-Index-Benchmark auf Basis gängiger Eigenmarken (Milfina, Cucina Nobile, Zurück zum Ursprung).
  - **Der Spar-Fuchs**: Optimierte Bestpreis-Mischung ("Kaufe Artikel X bei SPAR, Artikel Y bei BILLA, Artikel Z bei HOFER") inklusive Ersparnisberechnung.
- 🥗 **Ernährung & Allergien**:
  - Trennung zwischen **🌱 Vegetarisch** und **🌿 100% Vegan (Pflanzlich)**.
  - Allergie-Ausschlüsse: **🌾 Glutenfrei**, **🥛 Laktosefrei**, **🥚 Ohne Ei**, **🐟 Ohne Fisch**, **🥜 Ohne Nüsse**.
  - Favoriten: Lieblingsgerichte mit **❤️** markieren und in `localStorage` speichern, inklusive gezieltem Favoriten-Menü.
- 🔥 **Nährwert-Tracking**:
  - Kalorien (kcal), Eiweiß/Protein (g), Kohlenhydrate (g), Fett (g) und Ballaststoffe pro Portion.
  - Wöchentliche Durchschnittswerte & Gesamtenergie im Kalender-Banner.
- 🖨️ **Passgenauer A4-Druck**:
  - Ein Klick auf *A4 Kalender drucken* generiert einen übersichtlichen Speiseplan inklusive Checkliste für Frischeartikel, der via Print-CSS strikt auf **eine einzige A4-Seite** formatiert wird.

---

## 🛠️ Tech-Stack

- **Backend**: .NET 10.0 Minimal API (C#)
- **Frontend**: Single-Page-App (Vanilla JS, HTML5, Tailwind CSS, Lucide Icons)
- **APIs**:
  - SPAR Fact-Finder API
  - BILLA Product-Discovery API
  - HOFER Discounter Benchmark Index

---

## 🚀 Schnellstart

### Voraussetzungen
- [.NET 10.0 SDK](https://dotnet.microsoft.com/)

### Starten
```bash
# Repository klonen
git clone https://github.com/tsimhofer/austrian-meal-scout.git
cd austrian-meal-scout

# App starten
dotnet run --launch-profile http
```

Die Web-App ist anschließend unter **`http://localhost:5105`** erreichbar.

---

## 📡 API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET` | `/api/meals` | Gibt alle hinterlegten österreichischen Rezepte zurück |
| `GET` | `/api/meals/{id}` | Details zu einem bestimmten Rezept inklusive Zutaten & Nährwerten |
| `POST` | `/api/plan/generate` | Generiert einen 1–4 Wochen Kalenderplan mit Zutaten |
| `POST` | `/api/plan/reroll` | Würfelt ein einzelnes Gericht für einen bestimmten Tag neu aus |
| `POST` | `/api/ingredients/aggregate` | Aggregiert Zutaten über ausgewählte Wochen oder den gesamten Zeitraum |
| `POST` | `/api/scout/list` | Fragt die Live-Preise bei SPAR, BILLA und HOFER für eine Zutatenliste ab |

---

## 📄 Lizenz
MIT License. Erstellt für Genuss und Sparfuchstum in Österreich. 🇦🇹
