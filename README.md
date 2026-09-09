# Wanderly — Travel Explorer

Search any city on Earth and get a live snapshot of it: current weather, a 7‑day
forecast, sunrise and sunset, nearby places worth seeing, and an interactive map —
all pulled from real, free public APIs at the moment you search. Nothing about a
destination is hardcoded.

## Features

- Search any city or destination by name
- Live geocoding to resolve the place, its region, coordinates and timezone
- Current weather: temperature, condition, wind speed, humidity
- Sunrise and sunset times for that location
- 7‑day weather forecast
- Nearby attractions, museums, parks, restaurants, hotels and historic sites from OpenStreetMap
- Interactive Leaflet map with a marker for the destination and nearby places
- Favorites, saved to the browser with LocalStorage
- Search history (last 10 searches), also saved locally, with a "Clear History" option
- Loading state with a skeleton animation while data is being fetched
- Friendly error handling for empty searches, unknown destinations, and network/API failures
- Fully responsive layout (desktop, tablet, mobile)
- Dark / light mode toggle, remembered across visits

## Technologies Used

- HTML5 (semantic markup)
- CSS3 (custom properties, Flexbox, Grid, media queries — no framework)
- Vanilla JavaScript (ES2017+: `async`/`await`, `fetch`)
- JSON (parsing and rendering real API responses)
- REST APIs
- Fetch API
- LocalStorage
- Leaflet.js (map rendering) + OpenStreetMap tiles

No React, Vue, Angular, Node.js, Express, MongoDB, MySQL, Bootstrap or Tailwind
are used anywhere in this project.

## APIs Used

### 1. Open‑Meteo Geocoding API
`https://geocoding-api.open-meteo.com/v1/search?name={city}`

Turns a typed place name into structured data: the resolved city name, country,
region (`admin1`), latitude, longitude and timezone. This is the entry point for
every search — every other API call in the app depends on the coordinates this
one returns.

### 2. Open‑Meteo Weather API
`https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...`

Using the coordinates from the geocoding step, this returns the current
temperature, wind speed, humidity and weather code, plus a 7‑day daily forecast
(high/low temperatures, weather code, sunrise and sunset). The app translates
each numeric WMO weather code into a human‑readable label and icon — the code
itself always comes from the API; only its description is looked up locally.

### 3. Overpass API (OpenStreetMap)
`https://overpass-api.de/api/interpreter`

Queried with an Overpass QL statement built from the destination's coordinates,
this returns real nearby points of interest — attractions, museums, parks,
restaurants, cafés, hotels and historic sites — each with whatever tags OpenStreetMap
contributors have recorded (name, address fragments, category, coordinates).
Only places with a real `name` tag are shown, and only fields the API actually
returned are displayed.

### 4. Leaflet.js + OpenStreetMap tiles
Not a data API, but the mapping library used to render an interactive map
centered on the destination, with a marker for the destination itself and a
marker for each nearby place found via Overpass.

## How JSON Flows Through the App

1. The user submits a city name.
2. `fetch()` calls the Geocoding API; `response.json()` turns the raw response
   into a JavaScript object (`data.results[0]` holds the match).
3. The relevant fields (`latitude`, `longitude`, `name`, `country`, `admin1`,
   `timezone`) are pulled out of that object and used to update the DOM.
4. Those same coordinates are used to build the Weather API URL. Its JSON
   response is parsed the same way, and `current` / `daily` fields are read off
   to populate the weather cards and forecast strip.
5. The coordinates are also used to build an Overpass QL query. The JSON
   response's `elements` array is filtered and mapped into place cards and map
   markers.
6. Nothing here is invented — if a field is missing from a JSON response
   (e.g. no `admin1`, no address on a place), the UI says so instead of making
   something up.

## How JavaScript Connects Everything

`script.js` is organized around one orchestrating function, `searchDestination()`,
which calls, in order:

```
geocodeCity()        → resolves the destination
displayDestination()  → renders name/region/coordinates/timezone
getWeather()          → fetches + renders current weather and forecast
getPlaces()           → fetches + renders nearby places from Overpass
renderMap()           → draws the Leaflet map and markers
saveSearchHistory()   → records the search in LocalStorage
```

Favorites (`saveFavorite`, `removeFavorite`, `loadFavorites`) and history
(`saveSearchHistory`, `loadSearchHistory`) are separate, self‑contained
LocalStorage helpers so they persist across page reloads independently of any
network activity.

### API Flow

```
User → JavaScript → API → JSON → JavaScript → HTML
```

Concretely:

```
User searches "Paris"
        ↓
JavaScript reads input
        ↓
Geocoding API
        ↓
JSON response
        ↓
Extract latitude + longitude
        ↓
Weather API
        ↓
JSON response
        ↓
Display weather
        ↓
Overpass (Places) API
        ↓
Display attractions
        ↓
Display destination on map
        ↓
Save search in LocalStorage
```

## How to Run

No build step, no dependencies to install. Either:

1. **Open directly** — double‑click `index.html`, or drag it into a browser
   window.
2. **VS Code Live Server** — open the `travel-explorer` folder in VS Code,
   install the "Live Server" extension if you don't have it, then right‑click
   `index.html` → "Open with Live Server".

An internet connection is required, since every destination's data is fetched
live from Open‑Meteo and OpenStreetMap — there is no local/offline dataset.

## Project Structure

```
travel-explorer/
│
├── index.html
├── style.css
├── script.js
├── assets/
│   └── images/
└── README.md
```

## Notes on the Overpass API

The public Overpass instance (`overpass-api.de`) is a free, shared service and
can occasionally be slow or briefly unavailable under load. The app handles
this gracefully: if the places request fails or times out, the rest of the
page (destination, weather, forecast, map) still works, and the "Nearby
Places" section shows a plain message instead of breaking the page.

## Future Improvements

- Hotel booking integration
- Flight search
- Currency conversion for the destination's country
- User accounts to sync favorites across devices
- Multi‑day travel itinerary planner
- AI‑powered travel recommendations based on saved favorites
