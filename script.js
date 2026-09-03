function intro() {
  let intro_space = document.querySelector(".intro_space");
  let intro_block = document.querySelector(".intro_block");
  let logo = document.querySelector(".logo");
  let logo_i = document.querySelector(".logo i");
  let intro_dis = document.querySelector(".intro_dis");
  setTimeout(() => {
    logo_i.style.color = "white";
    intro_dis.innerHTML = `Click on a 
    <span class="xla">country</span> to explore !`;
    let xla = intro_dis.querySelector(".xla");
    logo_i.style.fontSize = "0vh";
    intro_block.style.gap = "0vh";
    xla.style.fontSize = "3.5vh";

  }, 2000)
  setTimeout(() => {
    logo.style.display = "none";
    intro_dis.style.paddingTop = "0vh";

  }, 3500)
  setTimeout(() => {
    intro_space.style.display = "none";

  }, 5000)

}
intro();


let dataform = document.querySelector(".clickondata1");
let del = document.querySelector(".navbar");
let addname = document.querySelector(".clickname");
let closebtn = document.querySelector("#closebtn");
let clickeddata = "";
let datasection = document.querySelector(".datasection");
let countryapi = "";
let basicinfopage = document.querySelector(".BasicInfo");
let historypage = document.querySelector(".History");
let databar = document.querySelector(".data");
let flagimg = document.querySelector(".imgmap");
let armsimg = document.querySelector(".armsimg");
let infor2 = document.querySelectorAll(".infor2");
//console.log(infor2);
let deepinfo2 = document.querySelectorAll(".deepinfo2");
let fallbackCountriesPromise;
let coatOfArmsCache = new Map();
let populationCache = new Map();
let notAvailableText = "Not available";

function buildMapLinksFromLatLng(latlng) {
  if (!Array.isArray(latlng) || latlng.length < 2) {
    return {};
  }
  let [lat, lng] = latlng;
  return {
    googleMaps: `https://www.google.com/maps?q=${lat},${lng}`,
    openStreetMaps: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=5/${lat}/${lng}`
  };
}

function normalizeCountry(country) {
  let countryCode = country.cca2?.toLowerCase();
  let latlng = Array.isArray(country.latlng) ? country.latlng : [];
  let generatedMaps = buildMapLinksFromLatLng(latlng);
  return {
    ...country,
    flags: {
      svg: country.flags?.svg || (countryCode ? `https://flagcdn.com/${countryCode}.svg` : ""),
      png: country.flags?.png || (countryCode ? `https://flagcdn.com/w320/${countryCode}.png` : "")
    },
    coatOfArms: {
      svg: country.coatOfArms?.svg || "",
      png: country.coatOfArms?.png || ""
    },
    capital: Array.isArray(country.capital) ? country.capital : [country.capital].filter(Boolean),
    capitalInfo: country.capitalInfo?.latlng ? country.capitalInfo : (latlng.length ? { latlng } : null),
    maps: {
      googleMaps: country.maps?.googleMaps || generatedMaps.googleMaps || "",
      openStreetMaps: country.maps?.openStreetMaps || generatedMaps.openStreetMaps || ""
    },
    currencies: country.currencies || {},
    languages: country.languages || {},
    demonyms: country.demonyms || {},
    postalCode: country.postalCode || null
  };
}

function getCountryNameMatches(country) {
  return [
    country.name?.common,
    country.name?.official,
    ...(Array.isArray(country.altSpellings) ? country.altSpellings : [])
  ]
    .filter(Boolean)
    .map(value => value.toLowerCase());
}

async function fetchCountryData(countryName) {
  let normalizedName = countryName.toLowerCase();
  try {
    let response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`);
    if (response.ok) {
      let restCountries = await response.json();
      let country = restCountries.find(item => getCountryNameMatches(item).includes(normalizedName)) || restCountries[0];
      if (country) {
        return [normalizeCountry(country)];
      }
    }
  }
  catch (error) {
    console.warn(`Primary country source failed for ${countryName}`, error);
  }

  if (!fallbackCountriesPromise) {
    fallbackCountriesPromise = fetch("https://raw.githubusercontent.com/mledoze/countries/master/countries.json")
      .then(response => {
        if (!response.ok) {
          throw new Error(`Fallback request failed with status ${response.status}`);
        }
        return response.json();
      });
  }
  let allCountries = await fallbackCountriesPromise;
  let country = allCountries.find(country => {
    return getCountryNameMatches(country).includes(normalizedName);
  });
  if (country) {
    return [normalizeCountry(country)];
  }
  throw new Error(`No country data is available for ${countryName}`);
}

async function fetchPopulation(countryCode) {
  if (!countryCode) {
    return "Not available";
  }
  if (populationCache.has(countryCode)) {
    return populationCache.get(countryCode);
  }
  try {
    let response = await fetch(`https://api.worldbank.org/v2/country/${countryCode}/indicator/SP.POP.TOTL?format=json`);
    if (!response.ok) {
      return "Not available";
    }
    let data = await response.json();
    let latest = data[1]?.find(entry => entry.value !== null);
    let population = latest?.value ?? "Not available";
    populationCache.set(countryCode, population);
    return population;
  }
  catch (error) {
    console.warn(`Population source failed for ${countryCode}`, error);
    return "Not available";
  }
}

function setImageSources(image, sources) {
  let validSources = sources.filter(source => typeof source === "string" && source.trim() !== "");
  image.onerror = null;
  if (!validSources.length) {
    image.removeAttribute("src");
    image.style.visibility = "hidden";
    return;
  }
  image.style.visibility = "visible";
  let sourceIndex = 0;
  image.onerror = function () {
    sourceIndex += 1;
    if (validSources[sourceIndex]) {
      image.src = validSources[sourceIndex];
      return;
    }
    image.onerror = null;
    image.removeAttribute("src");
    image.style.visibility = "hidden";
  };
  image.src = validSources[0];
}

async function fetchCoatOfArms(countryName) {
  if (coatOfArmsCache.has(countryName)) {
    return coatOfArmsCache.get(countryName);
  }
  let search = encodeURIComponent(`coat of arms of ${countryName}`);
  let url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${search}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url`;
  try {
    let response = await fetch(url);
    if (!response.ok) {
      return "";
    }
    let data = await response.json();
    let page = Object.values(data.query?.pages || {})[0];
    let imageUrl = page?.imageinfo?.[0]?.url || "";
    coatOfArmsCache.set(countryName, imageUrl);
    return imageUrl;
  }
  catch (error) {
    console.warn(`Coat of arms source failed for ${countryName}`, error);
    return "";
  }
}

function showCountryError(countryName) {
  addname.innerHTML = "";
  let message = document.createElement("p");
  message.innerText = `Unable to load details for ${countryName}. Please try again.`;
  addname.append(message);
  dataform.classList.remove("delpage");
  dataform.classList.add("anim");
  slidebar(0);
}

function collectDisplayValues(value) {
  if (value === undefined || value === null) {
    return [];
  }
  if (typeof value === "string") {
    let trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  if (typeof value === "boolean") {
    return [value ? "Yes" : "No"];
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => collectDisplayValues(item));
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap(item => collectDisplayValues(item));
  }
  return [String(value)];
}

function formatValue(value) {
  let values = collectDisplayValues(value);
  return values.length ? values.join(", ") : notAvailableText;
}

function getCurrencyNames(currencies) {
  if (!currencies || typeof currencies !== "object") {
    return notAvailableText;
  }
  let names = Object.values(currencies).map(currency => currency?.name).filter(Boolean);
  if (names.length) {
    return names.join(", ");
  }
  return formatValue(Object.keys(currencies));
}

function getCurrencySymbols(currencies) {
  if (!currencies || typeof currencies !== "object") {
    return notAvailableText;
  }
  let symbols = Object.values(currencies).map(currency => currency?.symbol).filter(Boolean);
  return symbols.length ? symbols.join(", ") : notAvailableText;
}

function getDemonymValue(demonyms, key) {
  let demonym = demonyms?.[key];
  if (!demonym) {
    return notAvailableText;
  }
  let values = [demonym.m, demonym.f].filter(Boolean);
  if (!values.length) {
    return notAvailableText;
  }
  return values.join(" / ");
}

function getSafeUrl(url) {
  if (!url) {
    return "";
  }
  try {
    let parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  }
  catch (error) {
    return "";
  }
  return "";
}

function renderFieldValues(nodes, values) {
  if (nodes.length !== values.length) {
    console.warn(`Field count mismatch: expected ${nodes.length}, got ${values.length}`);
  }
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].innerHTML = "";
    nodes[i].innerText = formatValue(values[i]);
  }
}

am4core.ready(function () {
  // Create map instance
  var chart = am4core.create("chartdiv", am4maps.MapChart);
  chart.geodata = am4geodata_worldLow;  // Use world map
  chart.projection = new am4maps.projections.Miller();

  // Create polygon series for countries
  var polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
  polygonSeries.useGeodata = true;

  // Array of colors for countries
  var colors = [
    am4core.color("#FF5733"), am4core.color("#33FF57"), am4core.color("#3357FF"),
    am4core.color("#FF33A6"), am4core.color("#FFD733"), am4core.color("#33FFD7"),
    am4core.color("#D733FF"), am4core.color("#FF335E"), am4core.color("#33FF33"),
    am4core.color("#5733FF"), am4core.color("#FF7F50"), am4core.color("#FF4500"),
    am4core.color("#32CD32"), am4core.color("#20B2AA"), am4core.color("#4169E1"),
    am4core.color("#8A2BE2"), am4core.color("#A52A2A"), am4core.color("#DEB887"),
    am4core.color("#5F9EA0"), am4core.color("#6495ED")
  ];

  // Assign colors to countries
  polygonSeries.mapPolygons.template.fill = am4core.color("#A0A0A0");
  polygonSeries.mapPolygons.template.events.on("inited", function (ev) {
    var polygon = ev.target;
    polygon.fill = colors[polygon.dataItem.index % colors.length];
  });

  // Add interaction to show country name on click
  let alertShown = false;
  polygonSeries.mapPolygons.template.events.on("hit", function (ev) {
    if (!alertShown) {
      let clickedCountry = ev.target.dataItem.dataContext.name;
      //alert("Clicked on " + clickedCountry);
      //   const box1high = document.querySelectorAll('.box');
      //   const inforheight = document.querySelectorAll('.infor1');
      //   // Function to match heights dynamically
      //   function updateHeight() {
      //     for(let i=0;i<box1high.length;i++){
      //   let box1Height = box1high[i].offsetHeight;// Get the current height of .box1
      //   inforheight[i].style.height = `${box1Height}px`; // Apply that height to .infor1
      //     }
      //   }
      //   // Initial height match
      // updateHeight();
      // // Update height on window resize
      //   window.addEventListener('resize', updateHeight);

      clickeddata = clickedCountry;
      animation();

      async function datafunc() {
        let data;
        try {
          data = await fetchCountryData(clickedCountry);
        }
        catch (error) {
          console.error(error);
          showCountryError(clickedCountry);
          return;
        }
        let country = data[0];
        let flag = country.flags;
        setImageSources(flagimg, [flag?.svg, flag?.png]);

        let basicValues = [
          country.name?.official || country.name?.common || clickedCountry,
          country.independent,
          country.status,
          country.altSpellings,
          country.capital,
          country.region,
          country.subregion,
          Object.values(country.languages || {}),
          getCurrencyNames(country.currencies),
          getCurrencySymbols(country.currencies),
          country.timezones,
          country.maps?.googleMaps || country.maps?.openStreetMaps,
          country.latlng,
          getDemonymValue(country.demonyms, "eng"),
          getDemonymValue(country.demonyms, "fra")
        ];
        renderFieldValues(infor2, basicValues);

        let mapUrl = getSafeUrl(country.maps?.googleMaps || country.maps?.openStreetMaps);
        if (mapUrl && infor2[11]) {
          let linkLabel = country.maps?.googleMaps ? "Google Maps" : "OpenStreetMap";
          infor2[11].innerHTML = `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer">${linkLabel}</a>`;
        }

        let population = country.population ?? await fetchPopulation(country.cca3);
        let deepValues = [
          country.idd?.root,
          country.idd?.suffixes,
          country.area,
          population,
          country.tld,
          country.landlocked,
          country.startOfWeek,
          country.borders,
          country.cca2,
          country.ccn3,
          country.cca3,
          country.cioc,
          country.car?.signs,
          country.capitalInfo?.latlng || country.latlng,
          country.postalCode?.format,
          country.postalCode?.regex
        ];
        renderFieldValues(deepinfo2, deepValues);

        let arms = country.coatOfArms;
        let coatOfArmsUrl = arms?.svg || arms?.png;
        setImageSources(armsimg, [coatOfArmsUrl]);
        if (!coatOfArmsUrl) {
          let fallbackCoatUrl = await fetchCoatOfArms(clickedCountry);
          setImageSources(armsimg, [fallbackCoatUrl]);
        }
      }
      datafunc();
      alertShown = true;
      setTimeout(function () {
        alertShown = false;
      }, 100);
    }
  });

  // Add labels for country names
  var labelSeries = chart.series.push(new am4maps.MapImageSeries());
  polygonSeries.events.on("inited", function () {
    polygonSeries.mapPolygons.each(function (polygon) {
      var label = labelSeries.mapImages.create();
      var boundingBox = polygon.polygon.bbox;

      if (boundingBox) {
        var center = chart.projection.invert({
          x: boundingBox.x + boundingBox.width / 2,
          y: boundingBox.y + boundingBox.height / 2
        });
        label.latitude = center.latitude;
        label.longitude = center.longitude;

        // Create label text
        var labelText = label.createChild(am4core.Label);
        labelText.text = polygon.dataItem.dataContext.name;
        labelText.horizontalCenter = "middle";
        labelText.verticalCenter = "middle";
        labelText.fontSize = "0.5vh";  // Set font size to 1.4vh
        labelText.nonScaling = true;
        labelText.fill = am4core.color("#000");
      }
    });
  });

  // Add tooltips for countries
  polygonSeries.mapPolygons.template.tooltipText = "{name}";
});





function animation() {
  //console.log(clickeddata);
  //console.log(window.getComputedStyle(dataform).zIndex);
  addname.innerHTML = "";
  displaydata();
  infor2.forEach(info => info.innerText = "Loading...");
  deepinfo2.forEach(info => info.innerText = "Loading...");
  dataform.classList.remove("delpage");
  dataform.classList.add("anim");
  slidebar(0);
}
function deldatapage() {
  // console.log(window.getComputedStyle(dataform).zIndex);
  //console.log(window.getComputedStyle(dataform).zIndex);
  dataform.classList.remove("anim");
  dataform.classList.add("delpage");
}
function displaydata() {
  let clickname = document.createElement("p");
  clickname.innerText = clickeddata;
  addname.append(clickname);
}
function slidebar(n) {
  let slides = document.querySelectorAll(".tool");
  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.remove("active");
  }
  slides[n].classList.add("active");
  if (n === 0) {
    basicinfopage.style.transform = "translateX(0)";
    historypage.style.transform = "translateX(100%)";
    basicinfopage.style.zIndex = 2;
    historypage.style.zIndex = 1;
  }
  else {
    basicinfopage.style.transform = "translateX(-100%)";
    historypage.style.transform = "translateX(0)";
    basicinfopage.style.zIndex = 1;
    historypage.style.zIndex = 2;
  }
}
