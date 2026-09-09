
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const OVERPASS_API = "https://overpass-api.de/api/interpreter";

const FAVORITES_KEY = "wanderly:favorites";
const HISTORY_KEY = "wanderly:history";
const THEME_KEY = "wanderly:theme";

const form = document.getElementById("search-form");
const input = document.getElementById("destination-input");
const searchError = document.getElementById("search-error");
const loading = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorTitle = document.getElementById("error-title");
const errorDetail = document.getElementById("error-detail");
const results = document.getElementById("results");

const destinationName = document.getElementById("destination-name");
const destinationRegion = document.getElementById("destination-region");
const destinationLat = document.getElementById("destination-lat");
const destinationLon = document.getElementById("destination-lon");
const destinationTimezone = document.getElementById("destination-timezone");

const favoriteBtn = document.getElementById("favorite-btn");
const favoriteIcon = document.getElementById("favorite-icon");

const weatherIcon = document.getElementById("weather-icon");
const weatherTemp = document.getElementById("weather-temp");
const weatherCondition = document.getElementById("weather-condition");
const weatherWind = document.getElementById("weather-wind");
const weatherHumidity = document.getElementById("weather-humidity");
const sunriseTime = document.getElementById("sunrise-time");
const sunsetTime = document.getElementById("sunset-time");
const forecastRow = document.getElementById("forecast-row");

const attractionsStatus = document.getElementById("attractions-status");
const placesGrid = document.getElementById("places-grid");
const mapElement = document.getElementById("map");

const favoritesList = document.getElementById("favorites-list");
const favoritesEmpty = document.getElementById("favorites-empty");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const clearHistoryBtn = document.getElementById("clear-history");
const popularChips = document.getElementById("popular-chips");
const themeToggle = document.getElementById("theme-toggle");

let currentDestination = null;
let map = null;
let markers = [];

function weatherInfo(code) {
    const list = {
        0: ["Clear sky", "☀️"],
        1: ["Mainly clear", "🌤️"],
        2: ["Partly cloudy", "⛅"],
        3: ["Cloudy", "☁️"],
        45: ["Fog", "🌫️"],
        48: ["Fog", "🌫️"],
        51: ["Drizzle", "🌦️"],
        53: ["Drizzle", "🌦️"],
        55: ["Heavy drizzle", "🌦️"],
        61: ["Rain", "🌧️"],
        63: ["Rain", "🌧️"],
        65: ["Heavy rain", "🌧️"],
        71: ["Snow", "❄️"],
        73: ["Snow", "❄️"],
        75: ["Heavy snow", "❄️"],
        80: ["Rain showers", "🌦️"],
        81: ["Rain showers", "🌦️"],
        82: ["Heavy rain", "⛈️"],
        85: ["Snow showers", "🌨️"],
        86: ["Heavy snow", "🌨️"],
        95: ["Thunderstorm", "⛈️"],
        96: ["Thunderstorm", "⛈️"],
        99: ["Thunderstorm", "⛈️"]
    };

    return list[code] || ["Weather unavailable", "🌡️"];
}

document.addEventListener("DOMContentLoaded", function () {
    loadTheme();
    showFavorites();
    showHistory();

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const city = input.value.trim();

        if (city === "") {
            searchError.textContent =
                "Please enter a city or destination.";

            searchError.hidden = false;
            return;
        }

        searchError.hidden = true;
        searchDestination(city);
    });

    themeToggle.addEventListener("click", changeTheme);
    clearHistoryBtn.addEventListener("click", clearHistory);
    favoriteBtn.addEventListener("click", toggleFavorite);

    popularChips.addEventListener("click", function (e) {
        const chip = e.target.closest(".chip");

        if (chip) {
            input.value = chip.dataset.city;
            searchDestination(chip.dataset.city);
        }
    });
});

async function searchDestination(city) {
    showLoading();

    try {
        const place = await findCity(city);

        if (!place) {
            showError(
                "Destination not found",
                "Please try another city or country."
            );
            return;
        }

        currentDestination = place;

        showDestination(place);
        showResults();

        await getWeather(place);
        await getPlaces(place);

        showMap(place);

        saveHistory(place.name);
        showHistory();
        updateFavoriteButton();

    } catch (error) {
        console.log(error);

        showError(
            "Something went wrong",
            "Please check your internet connection and try again."
        );
    }
}

async function findCity(city) {
    const url =
        GEOCODING_API +
        "?name=" +
        encodeURIComponent(city) +
        "&count=1&language=en&format=json";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Geocoding error");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        return null;
    }

    const c = data.results[0];

    return {
        name: c.name,
        country: c.country || "",
        admin1: c.admin1 || "",
        latitude: c.latitude,
        longitude: c.longitude,
        timezone: c.timezone || ""
    };
}

function showDestination(place) {
    destinationName.textContent =
        place.name +
        (place.country ? ", " + place.country : "");

    destinationRegion.textContent =
        place.admin1 || "Not available";

    destinationLat.textContent =
        Number(place.latitude).toFixed(4);

    destinationLon.textContent =
        Number(place.longitude).toFixed(4);

    destinationTimezone.textContent =
        place.timezone || "Not available";
}

async function getWeather(place) {
    const url =
        WEATHER_API +
        "?latitude=" +
        place.latitude +
        "&longitude=" +
        place.longitude +
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset" +
        "&timezone=auto";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Weather error");
        }

        const data = await response.json();

        showWeather(data);
        showForecast(data);

    } catch (error) {
        weatherError();
    }
}

function showWeather(data) {
    if (!data.current) {
        weatherError();
        return;
    }

    const c = data.current;
    const w = weatherInfo(c.weather_code);

    weatherIcon.textContent = w[1];
    weatherCondition.textContent = w[0];

    weatherTemp.textContent =
        c.temperature_2m !== undefined
            ? Math.round(c.temperature_2m) + "°C"
            : "—";

    weatherWind.textContent =
        c.wind_speed_10m !== undefined
            ? c.wind_speed_10m + " km/h"
            : "Not available";

    weatherHumidity.textContent =
        c.relative_humidity_2m !== undefined
            ? c.relative_humidity_2m + "%"
            : "Not available";

    if (data.daily) {
        sunriseTime.textContent =
            data.daily.sunrise
                ? formatTime(data.daily.sunrise[0])
                : "Not available";

        sunsetTime.textContent =
            data.daily.sunset
                ? formatTime(data.daily.sunset[0])
                : "Not available";
    }
}

function weatherError() {
    weatherIcon.textContent = "🌡️";
    weatherCondition.textContent = "Weather unavailable";
    weatherTemp.textContent = "—";
    weatherWind.textContent = "Not available";
    weatherHumidity.textContent = "Not available";
    sunriseTime.textContent = "Not available";
    sunsetTime.textContent = "Not available";

    forecastRow.innerHTML =
        '<p class="empty-note">Forecast data is unavailable.</p>';
}

function showForecast(data) {
    forecastRow.innerHTML = "";

    if (!data.daily || !data.daily.time) {
        forecastRow.innerHTML =
            '<p class="empty-note">Forecast data is unavailable.</p>';

        return;
    }

    for (let i = 0; i < data.daily.time.length; i++) {

        const w = weatherInfo(
            data.daily.weather_code[i]
        );

        const card = document.createElement("div");

        card.className = "forecast-card";

        card.innerHTML =
            '<p class="forecast-day">' +
            dayName(data.daily.time[i], i) +
            "</p>" +

            '<span class="forecast-icon">' +
            w[1] +
            "</span>" +

            '<p class="forecast-range">' +

            '<span class="max">' +
            Math.round(
                data.daily.temperature_2m_max[i]
            ) +
            "°</span> " +

            '<span class="min">' +
            Math.round(
                data.daily.temperature_2m_min[i]
            ) +
            "°</span>" +

            "</p>";

        forecastRow.appendChild(card);
    }
}

function dayName(dateText, index) {
    if (index === 0) {
        return "Today";
    }

    const date =
        new Date(dateText + "T00:00:00");

    return date.toLocaleDateString(
        undefined,
        {
            weekday: "short"
        }
    );
}

function formatTime(time) {
    const date = new Date(time);

    return date.toLocaleTimeString(
        undefined,
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

async function getPlaces(place) {

    attractionsStatus.hidden = false;

    attractionsStatus.textContent =
        "Finding nearby places...";

    placesGrid.innerHTML = "";

    const query =
        '[out:json][timeout:20];(' +

        'node["tourism"](around:3000,' +
        place.latitude + "," +
        place.longitude +
        ');' +

        'node["amenity"~"restaurant|cafe"]' +
        '(around:1500,' +
        place.latitude + "," +
        place.longitude +
        ');' +

        'node["leisure"="park"]' +
        '(around:3000,' +
        place.latitude + "," +
        place.longitude +
        ');' +

        'node["historic"]' +
        '(around:3000,' +
        place.latitude + "," +
        place.longitude +
        ');' +

        ');out body 40;';

    try {

        const response = await fetch(
            OVERPASS_API,
            {
                method: "POST",

                headers: {
                    "Content-Type": "text/plain"
                },

                body: query
            }
        );

        if (!response.ok) {
            throw new Error("Places error");
        }

        const data =
            await response.json();

        const named = [];

        for (
            let i = 0;
            i < data.elements.length;
            i++
        ) {

            if (
                data.elements[i].tags &&
                data.elements[i].tags.name
            ) {
                named.push(data.elements[i]);
            }
        }

        if (named.length === 0) {

            attractionsStatus.textContent =
                "No named places were found nearby.";

            return;
        }

        attractionsStatus.textContent =
            named.length +
            " places found nearby.";

        showPlaces(
            named.slice(0, 24)
        );

    } catch (error) {

        attractionsStatus.textContent =
            "Nearby places could not be loaded.";
    }
}

function category(tags) {

    if (
        tags.tourism === "hotel" ||
        tags.tourism === "guest_house"
    ) {
        return "Hotel";
    }

    if (tags.tourism) {
        return "Attraction";
    }

    if (
        tags.amenity === "restaurant" ||
        tags.amenity === "cafe"
    ) {
        return "Food & drink";
    }

    if (tags.leisure === "park") {
        return "Park";
    }

    if (tags.historic) {
        return "Historic site";
    }

    return "Place";
}

function showPlaces(places) {

    placesGrid.innerHTML = "";

    for (
        let i = 0;
        i < places.length;
        i++
    ) {

        const p = places[i];
        const t = p.tags || {};

        let address = "";

        if (t["addr:housenumber"]) {
            address +=
                t["addr:housenumber"] + " ";
        }

        if (t["addr:street"]) {
            address +=
                t["addr:street"] + " ";
        }

        if (t["addr:city"]) {
            address +=
                t["addr:city"];
        }

        const card =
            document.createElement("article");

        card.className =
            "place-card";

        card.innerHTML =

            '<span class="place-category">' +
            category(t) +
            "</span>" +

            '<h4 class="place-name">' +
            safe(t.name) +
            "</h4>" +

            (
                address
                    ? '<p class="place-address">' +
                      safe(address) +
                      "</p>"
                    : ""
            ) +

            '<p class="place-coords">' +
            Number(p.lat).toFixed(4) +
            ", " +
            Number(p.lon).toFixed(4) +
            "</p>";

        placesGrid.appendChild(card);
    }
}

function safe(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text || "";

    return div.innerHTML;
}

function showMap(place) {

    if (!map) {

        map =
            L.map(mapElement);

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors",

                maxZoom: 19
            }
        ).addTo(map);
    }

    for (
        let i = 0;
        i < markers.length;
        i++
    ) {
        map.removeLayer(
            markers[i]
        );
    }

    markers = [];

    map.setView(
        [
            place.latitude,
            place.longitude
        ],
        13
    );

    const main =
        L.marker([
            place.latitude,
            place.longitude
        ])
        .addTo(map)
        .bindPopup(
            "<strong>" +
            safe(place.name) +
            "</strong>"
        );

    markers.push(main);

    const coords =
        placesGrid.querySelectorAll(
            ".place-coords"
        );

    for (
        let i = 0;
        i < coords.length;
        i++
    ) {

        const parts =
            coords[i].textContent.split(",");

        const lat =
            parseFloat(parts[0]);

        const lon =
            parseFloat(parts[1]);

        if (
            isNaN(lat) ||
            isNaN(lon)
        ) {
            continue;
        }

        const name =
            coords[i]
                .parentElement
                .querySelector(".place-name");

        const marker =
            L.marker([lat, lon])
            .addTo(map)
            .bindPopup(
                "<strong>" +
                (
                    name
                        ? name.textContent
                        : "Place"
                ) +
                "</strong>"
            );

        markers.push(marker);
    }

    setTimeout(
        function () {
            map.invalidateSize();
        },
        200
    );
}

// ===============================
// Favorites
// ===============================

function getFavorites() {

    try {

        return JSON.parse(
            localStorage.getItem(
                FAVORITES_KEY
            )
        ) || [];

    } catch (e) {

        return [];
    }
}

function saveFavorite(place) {

    const favorites =
        getFavorites();

    for (
        let i = 0;
        i < favorites.length;
        i++
    ) {

        if (
            favorites[i].name ===
                place.name &&

            favorites[i].country ===
                place.country
        ) {
            return;
        }
    }

    favorites.push({
        name: place.name,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude
    });

    localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(favorites)
    );
}

function removeFavorite(
    name,
    country
) {

    const favorites =
        getFavorites();

    const newList = [];

    for (
        let i = 0;
        i < favorites.length;
        i++
    ) {

        if (
            favorites[i].name !== name ||
            favorites[i].country !== country
        ) {
            newList.push(
                favorites[i]
            );
        }
    }

    localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(newList)
    );

    showFavorites();
    updateFavoriteButton();
}

function showFavorites() {

    const favorites =
        getFavorites();

    const old =
        favoritesList.querySelectorAll(
            ".tag-pill"
        );

    for (
        let i = 0;
        i < old.length;
        i++
    ) {
        old[i].remove();
    }

    favoritesEmpty.hidden =
        favorites.length !== 0;

    for (
        let i = 0;
        i < favorites.length;
        i++
    ) {

        const f =
            favorites[i];

        const item =
            document.createElement("div");

        item.className =
            "tag-pill";

        item.innerHTML =
            '<button type="button" class="tag-label">' +
            "❤️ " +
            safe(f.name) +

            (
                f.country
                    ? ", " +
                      safe(f.country)
                    : ""
            ) +

            '</button>' +

            '<button type="button" class="remove-fav">' +
            "✕" +
            "</button>";

        item
            .querySelector(
                ".tag-label"
            )
            .addEventListener(
                "click",
                function () {

                    input.value =
                        f.name;

                    searchDestination(
                        f.name
                    );
                }
            );

        item
            .querySelector(
                ".remove-fav"
            )
            .addEventListener(
                "click",
                function () {

                    removeFavorite(
                        f.name,
                        f.country
                    );
                }
            );

        favoritesList.appendChild(
            item
        );
    }
}

function toggleFavorite() {

    if (!currentDestination) {
        return;
    }

    const favorites =
        getFavorites();

    let found = false;

    for (
        let i = 0;
        i < favorites.length;
        i++
    ) {

        if (
            favorites[i].name ===
                currentDestination.name &&

            favorites[i].country ===
                currentDestination.country
        ) {

            found = true;
            break;
        }
    }

    if (found) {

        removeFavorite(
            currentDestination.name,
            currentDestination.country
        );

    } else {

        saveFavorite(
            currentDestination
        );

        showFavorites();
        updateFavoriteButton();
    }
}

function updateFavoriteButton() {

    if (!currentDestination) {
        return;
    }

    const favorites =
        getFavorites();

    let found = false;

    for (
        let i = 0;
        i < favorites.length;
        i++
    ) {

        if (
            favorites[i].name ===
                currentDestination.name &&

            favorites[i].country ===
                currentDestination.country
        ) {

            found = true;
            break;
        }
    }

    favoriteIcon.textContent =
        found ? "❤️" : "🤍";

    favoriteBtn.lastChild.textContent =
        found
            ? " Saved to Favorites"
            : " Add to Favorites";
}

// ===============================
// Search History
// ===============================

function getHistory() {

    try {

        return JSON.parse(
            localStorage.getItem(
                HISTORY_KEY
            )
        ) || [];

    } catch (e) {

        return [];
    }
}

function saveHistory(name) {

    const old =
        getHistory();

    const history = [name];

    for (
        let i = 0;
        i < old.length;
        i++
    ) {

        if (
            old[i].toLowerCase() !==
            name.toLowerCase()
        ) {
            history.push(
                old[i]
            );
        }
    }

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(
            history.slice(0, 10)
        )
    );
}

function showHistory() {

    const history =
        getHistory();

    const old =
        historyList.querySelectorAll(
            ".tag-pill"
        );

    for (
        let i = 0;
        i < old.length;
        i++
    ) {
        old[i].remove();
    }

    historyEmpty.hidden =
        history.length !== 0;

    for (
        let i = 0;
        i < history.length;
        i++
    ) {

        const name =
            history[i];

        const item =
            document.createElement("div");

        item.className =
            "tag-pill";

        item.innerHTML =
            '<button type="button" class="tag-label">' +
            "🔎 " +
            safe(name) +
            "</button>";

        item
            .querySelector(
                ".tag-label"
            )
            .addEventListener(
                "click",
                function () {

                    input.value =
                        name;

                    searchDestination(
                        name
                    );
                }
            );

        historyList.appendChild(
            item
        );
    }
}

function clearHistory() {

    localStorage.removeItem(
        HISTORY_KEY
    );

    showHistory();
}

// ===============================
// Dark / Light Theme
// ===============================

function loadTheme() {

    const theme =
        localStorage.getItem(
            THEME_KEY
        ) || "light";

    setTheme(theme);
}

function changeTheme() {

    const current =
        document.documentElement
            .getAttribute(
                "data-theme"
            );

    if (current === "dark") {
        setTheme("light");
    } else {
        setTheme("dark");
    }
}

function setTheme(theme) {

    if (theme === "dark") {

        document.documentElement
            .setAttribute(
                "data-theme",
                "dark"
            );

        themeToggle
            .querySelector(
                ".theme-icon"
            )
            .textContent = "☀️";

        themeToggle.setAttribute(
            "aria-pressed",
            "true"
        );

    } else {

        document.documentElement
            .removeAttribute(
                "data-theme"
            );

        themeToggle
            .querySelector(
                ".theme-icon"
            )
            .textContent = "🌙";

        themeToggle.setAttribute(
            "aria-pressed",
            "false"
        );
    }

    localStorage.setItem(
        THEME_KEY,
        theme
    );
}

// ===============================
// Screen states
// ===============================

function showLoading() {

    loading.hidden = false;
    errorState.hidden = true;
    results.hidden = true;
}

function showError(
    title,
    message
) {

    loading.hidden = true;
    errorState.hidden = false;
    results.hidden = true;

    errorTitle.textContent =
        title;

    errorDetail.textContent =
        message;
}

function showResults() {

    loading.hidden = true;
    errorState.hidden = true;
    results.hidden = false;
}
