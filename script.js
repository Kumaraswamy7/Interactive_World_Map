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

async function fetchCountryData(countryName) {
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
  let normalizedName = countryName.toLowerCase();
  let country = allCountries.find(country => {
    let names = [country.name?.common, country.name?.official];
    return names.some(name => name?.toLowerCase() === normalizedName);
  });
  if (country) {
    let countryCode = country.cca2?.toLowerCase();
    country.flags = countryCode ? {
      png: `https://flagcdn.com/w320/${countryCode}.png`
    } : null;
    country.capital = Array.isArray(country.capital) ? country.capital : [country.capital].filter(Boolean);
    country.capitalInfo = country.latlng ? { latlng: country.latlng } : null;
    return [country];
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
  let validSources = sources.filter(Boolean);
  let sourceIndex = 0;
  image.onerror = function () {
    sourceIndex += 1;
    image.src = validSources[sourceIndex] || "";
  };
  image.src = validSources[0] || "";
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

      async function datafunc(countryapi) {
        let data;
        try {
          data = await fetchCountryData(clickedCountry);
        }
        catch (error) {
          console.error(error);
          showCountryError(clickedCountry);
          return;
        }
        let flag = data[0].flags;
        setImageSources(flagimg, [flag?.svg, flag?.png]);
        let arms = data[0].coatOfArms;
        let coatOfArmsUrl = arms?.svg || arms?.png;
        let basicdata = [];
        let histodata = [];
        console.log(data);
        basicdata.push(data[0].name?.official || data[0].name?.common || clickedCountry)
        let checkarr = ["independent", "status", "altSpellings", "capital", "region", "subregion", "languages", "currencies", "timezones", "maps", "latlng", "demonyms"];
        for (let i = 0; i < checkarr.length; i++) {
          let j = 0;
          if (data[0][checkarr[i]]) {
            if (i === 6 || i === 9) {
              basicdata.push(Object.values(data[0][checkarr[i]]));
            }
            else {
              if (i === 7 || i === 11) {
                if (i === 7) {
                  let madifi = Object.values(data[0][checkarr[i]]);
                  basicdata.push(Object.values(madifi[0]));
                }
                else {
                  let demon = Object.values(data[0][checkarr[i]]);
                  if (demon.length == 2) {
                    basicdata.push(Object.values(demon[0]));
                    basicdata.push(Object.values(demon[1]));
                  }
                  else {
                    basicdata.push(Object.values(demon[0]));
                  }
                }
              }
              else {
                basicdata.push(data[0][checkarr[i]]);
                //console.log(basicdata);
                j += 1;
              }
            }
          }
          else {
            //console.log(checkarr[i],data[0][checkarr[i]]);
            basicdata.push("Not available");
          }
          // if(j===checkarr.length){
          //   getd();
          // }
        }
        basicaddtopage();
        function basicaddtopage() {
          let i2 = 0;
          for (let i = 0; i <= basicdata.length; i++) {
            if (i === 8) {
              infor2[9].innerHTML = "";
            }
            infor2[i].innerHTML = "";
            if (Array.isArray(basicdata[i2])) {
              for (j = 0; j < basicdata[i2].length; j++) {
                // infor2[i].innerText+= basicdata[i][j];
                if (i === 8) {
                  let k = i;
                  abc();
                  function abc() {
                    let textNode = document.createTextNode(basicdata[k][j]);
                    infor2[i].appendChild(textNode);
                    j += 1;
                  }
                  if (i === 8) {
                    i += 1;
                    abc();
                  }
                }
                else {
                  if (i === 10) {
                    i2 = 9;
                    let textNode = document.createTextNode(basicdata[i2][j]);
                    infor2[i].appendChild(textNode);
                    let lineBreak = document.createElement('br'); // Create a line break
                    infor2[i].appendChild(lineBreak); // Append the line break to the container
                  }
                  else {
                    let textNode = document.createTextNode(basicdata[i2][j]);
                    infor2[i].appendChild(textNode);
                    let lineBreak = document.createElement('br'); // Create a line break
                    infor2[i].appendChild(lineBreak);
                  }
                }
              }
            }
            else {
              if (i === 8) {
                infor2[i].innerText = basicdata[i];
                //console.log(infor2[i].innerText);
                i += 1;
              }
              else {
                infor2[i].innerText = basicdata[i2];
                //console.log(infor2[i].innerText)
                //console.log(basicdata[i2]);
              }
            }
            //console.log(i2,i);
            i2 += 1;
          }
        }
        historyload();
        async function historyload() {
          let population = data[0].population ?? await fetchPopulation(data[0].cca3);
          histodata.push(data[0].idd?.root || "Not available");
          histodata.push(data[0].idd?.suffixes || "Not available");
          // let checkarr=["area","population","tld","landlocked","startOfWeek","borders","cca2","ccn3","cca3","cioc"];
          // for(let i=0;i<checkarr.length;i++){
          //   if(data[0][checkarr[i]]){
          //         histodata.push(data[0][checkarr[i]]);
          //   }
          //   else{
          //     histodata.push("none");
          //   }
          // }
          let checkarr = ["area", "population", "tld", "landlocked", "startOfWeek", "borders", "cca2", "ccn3", "cca3", "cioc"];
          for (let i = 0; i < checkarr.length; i++) {
            // Explicitly check for undefined or null
            if (checkarr[i] === "population" || (data[0][checkarr[i]] !== undefined && data[0][checkarr[i]] !== null)) {
              histodata.push(checkarr[i] === "population" ? population : data[0][checkarr[i]]);
            } else {
              histodata.push("Not available");
            }
          }
          histodata.push(data[0].car?.signs || "Not available");
          histodata.push(data[0].capitalInfo?.latlng || data[0].latlng || "Not available");
          histodata.push(data[0].postalCode?.format || "Not available");
          histodata.push(data[0].postalCode?.regex || "Not available");
          historyadd();
          //   function getd(){
          // histodata.push(data[0].idd.root);
          // histodata.push(data[0].idd.suffixes);
          // histodata.push(data[0].area);
          // histodata.push(data[0].population);
          // histodata.push(data[0].tld);
          // histodata.push(data[0].landlocked);
          // histodata.push(data[0].startOfWeek);
          // histodata.push(data[0].borders);
          // histodata.push(data[0].cca2);
          // histodata.push(data[0].ccn3);
          // histodata.push(data[0].cca3);
          // histodata.push(data[0].cioc);
          // histodata.push(data[0].car.signs);
          // histodata.push(data[0].capitalInfo.latlng);
          // histodata.push(data[0].postalCode.format);
          // histodata.push(data[0].postalCode.regex);


          // console.log(histodata);
          //   }
        }
        historyadd();
        function historyadd() {

          for (let i = 0; i < histodata.length; i++) {
            if (!deepinfo2[i]) {
              console.warn(`Element deepinfo2[${i}] does not exist.`);
              continue; // Skip this iteration
            }
            deepinfo2[i].innerHTML = "";
            if (Array.isArray(histodata[i])) {
              for (let j = 0; j < histodata[i].length; j++) {
                // infor2[i].innerText+= basicdata[i][j];
                let textNode = document.createTextNode(String(histodata[i][j]));
                deepinfo2[i].appendChild(textNode);
                let lineBreak = document.createElement('br'); // Create a line break
                deepinfo2[i].appendChild(lineBreak); // Append the line break to the container
              }
            }
            else {
              deepinfo2[i].innerText = String(histodata[i] ?? "Not available");
              //console.log(infor2[i].innerText)
              //console.log(basicdata[i2]);
            }
          }
        }


        // function getd(){
        // let basicdata=[data[0].name.official];
        // basicdata.push(data[0].independent);
        // basicdata.push(data[0].status);
        // basicdata.push(data[0].altSpellings);
        // basicdata.push(data[0].capital);
        // basicdata.push(data[0].region);
        // basicdata.push(data[0].subregion);
        // basicdata.push(Object.values(data[0].languages));
        // let curr=Object.values(data[0].currencies);
        // basicdata.push(Object.values(curr[0]));
        // basicdata.push(data[0].timezones);
        // basicdata.push(Object.values(data[0].maps));
        // basicdata.push(data[0].latlng);
        // let demony=Object.values(data[0].demonyms)
        // basicdata.push(Object.values(demony[0]));
        // basicdata.push(Object.values(demony[1]));
        // console.log(basicdata);
        // }
        setImageSources(armsimg, [coatOfArmsUrl]);
        if (!coatOfArmsUrl) {
          fetchCoatOfArms(clickedCountry).then(url => setImageSources(armsimg, [url]));
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
