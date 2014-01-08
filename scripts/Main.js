/*
 * Creates a world map of timezones.
 *
 * This uses a Self-Executing Anonymous Function to declare the namespace "Main" and create public and private members within it.
 *
 * @author Kevin Dean
 *
 */

/*
 * @param Main: Defines the namespace to use for public members of this class.
 * @param undefined: Nothing should be passed via this parameter. This ensures that you can use "undefined" here without worrying that another loaded
 *						script as redefined the global variable "undefined".
 */
(function(Main, undefined) {

	/**********************
	 * Constants
	 **********************/

	var BODY_NBRS = {MIN_WIDTH: 900, MAX_WIDTH: 1400};
	var MAP_NBRS = {WIDTH: 0, HEIGHT: 0, SCALE: 0, MIN_SCALE: 140, MAX_SCALE: 220};
	var STROKE_WIDTH_NBRS = {ANTARCTICA: 0.5, GRATICULE: 0.5, TIMEZONE: 1.25};
	var HIGHTLIGHT_COLOR = "#FFFFCC";
	var TIMEZONE_OFFSETS_DOMAIN = ["-11:00", "-10:00", "-9:30", "-9:00", "-8:00", "-7:00", "-6:00", "-5:00", "-4:30", "-4:00", "-3:30", "-3:00", "-2:00", "-1:00", "0:00", "1:00", "2:00", "3:00", "3:30", "4:00", "4:30", "5:00", "5:30", "5:45", "6:00", "6:30", "7:00", "8:00", "8:45", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:45", "13:00", "14:00"];
	var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	var CLOCK_NBRS = {WIDTH: 0, HEIGHT: 700, MAJOR_MARK_INTERVAL: 3, HAND_WIDTH: 3, ACTIVE_AM_HOURS: 3, ACTIVE_PM_HOURS: 5};
	var ARC_X_AXIS_ROT_DEG_NBR = 0, LARGE_ARC_FLAG = 0;
	var DAY_MINS_NBR = 1440;
	var RING_NBRS = {INIT_INNER_RADIUS: 220, ARC_WIDTH: 10, ACTIVE_HOURS_ARC_MARGIN: 2.5, ARC_MARGIN: 20, MAX: 7, MAX_LABEL_CHARS: 30};
	var INPUT_TXT = {ENABLED: 'Add a location (e.g., "Berlin")', DISABLED: "Must clear current locations", NO_RESULTS: "Could not find this location",
					LIMIT: "Try again later. Google's request limit reached.", DENIED: "Google denied this request", INVALID: "What did you do?! Invalid request.", 
					SERVER: "Server error. Try again."};
	var INPUT_COLORS = {OK: "#FFFFFF", PROBLEM: "#FF7878"};


	/**********************
	 * Global variables
	 **********************/
	var _utcDateElem, _utcTimeElem, _locInputElem, _yearElem, _monthElem, _dateElem, _timeTool, _clockContentGroup;
	var _yearNbr, _monthNbr, _dateNbr, _timeSetInd = false;
	var _localities = [];
	var _defaultLoc = {latitude: 41.85, longitude: -87.649999};  // Default to Chicago.
	var _geocoder;


	/**********************
	 * Public methods
	 **********************/

	/*
	 * Returns a Boolean indicating whether or not this browser is able to view this content.
	 */
	Main.CheckCompatibility = function() {
		return !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect;
	};



	/*
	 * Initializes the scene.
	 */
	Main.Init = function() {

		// Size the map to the current browser window size, taking into account our minimum and maximum width settings.
		var bodyElem = document.getElementsByTagName("body")[0];
		MAP_NBRS.WIDTH = bodyElem.clientWidth;
		MAP_NBRS.HEIGHT = MAP_NBRS.WIDTH/2;
		MAP_NBRS.SCALE = ((bodyElem.clientWidth - BODY_NBRS.MIN_WIDTH) / (BODY_NBRS.MAX_WIDTH - BODY_NBRS.MIN_WIDTH)) * (MAP_NBRS.MAX_SCALE - MAP_NBRS.MIN_SCALE) + MAP_NBRS.MIN_SCALE;

		CLOCK_NBRS.WIDTH = MAP_NBRS.WIDTH;
		//CLOCK_NBRS.HEIGHT = MAP_NBRS.HEIGHT;  We'll allow the clock to take up a constant height.

		_utcDateElem = document.getElementById("utcDate");
		_utcTimeElem = document.getElementById("utcTime");

		_geocoder = new google.maps.Geocoder();

		setupPrototypes();

		updateCurrDateAndTime();

		createTimeZoneMap();

		createRelativeTimeTool();

		animate();
	};



	/*
	 * Handles the Keyup event of the location input box.
	 */
	Main.HandleLocationInputOnKeyup = function(inpEvent) {
		if (inpEvent.keyCode == 13) {			
			retrieveLocData(1, _locInputElem.value);
			_locInputElem.value = "";
		}
	}



	/*
	 * Handles the click event of the Clear button.
	 */
	Main.HandleClearButtonClick = function() {
		clearClockContent();
		_localities = [];

		_locInputElem.disabled = false;
		_locInputElem.placeholder = INPUT_TXT.ENABLED;	
	}



	/*
	 * Handles the click event of the Clear button.
	 */
	Main.HandleTodayButtonClick = function() {
		setCurrentDate();
		updateLocalityTimes();
	}



	/*
	 * Handles the OnKeyUp event of date input boxes.
	 */
	Main.HandleDateOnKeyup = function(inpEvent) {
		var validDataInd = true;

		if (isNaN(_yearElem.value)) {
			_yearElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
			validDataInd = false;
		} else {
			_yearElem.style.backgroundColor = "";
		}


		if (isNaN(_monthElem.value)) {
			_monthElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
			validDataInd = false;
		} else {
			_monthElem.style.backgroundColor = "";
		}

		if (isNaN(_dateElem.value)) {
			_dateElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
			validDataInd = false;
		} else {
			_dateElem.style.backgroundColor = "";
		}


		if (inpEvent.keyCode == 13 && validDataInd) {
			var yearNbr = Number(_yearElem.value);
			if (yearNbr < 1) {
				yearNbr = 1;
			} else if (yearNbr > 3000) {
				yearNbr = 3000;  // 3000 is the upper year limit in the SolarCalculator.
			}
			_yearNbr = _yearElem.value = yearNbr;


			var monthNbr = Number(_monthElem.value);
			if (monthNbr < 1) {
				monthNbr = 1;
			} else if (monthNbr > 12) {
				monthNbr = 12;
			}
			_monthNbr = monthNbr;
			_monthElem.value = (_monthNbr < 10) ? "0" + _monthNbr.toString() : _monthNbr;


			var dateNbr = Number(_dateElem.value);
			if (dateNbr < 1) {
				dateNbr = 1;
			} else if (dateNbr > 31) {
				dateNbr = 31;
			}
			// This will correct the last day of February for Leap Year if needed.
			var validatedDate = SolarCalculator.ValidateDate(_yearNbr, _monthNbr, dateNbr);
			_dateNbr = Number(validatedDate.date);
			_dateElem.value = (_dateNbr < 10) ? "0" + _dateNbr.toString() : _dateNbr;

			updateLocalityTimes();
		}
	}


	/**********************
	 * Private methods
	 **********************/

	function setupPrototypes() {
		Element.prototype.hasClassName = function(inpNm) {
		    return new RegExp("(?:^|\\s+)" + inpNm + "(?:\\s+|$)").test(this.className);
		};

		Element.prototype.addClassName = function(inpNm) {
		    if (!this.hasClassName(inpNm)) {
		        this.className = this.className ? [this.className, inpNm].join(" ") : inpNm;
		    }
		};

		Element.prototype.removeClassName = function(inpNm) {
		    if (this.hasClassName(inpNm)) {
		        var c = this.className;
		        this.className = c.replace(new RegExp("(?:^|\\s+)" + inpNm + "(?:\\s+|$)", "g"), "");
		        /* (?:^|\s) = Match the start of the string or any single whitespace character
				 * load = The class name to remove
				 * (?!\S) = Negative look-ahead to verify the above is the whole class name. It ensures there is no non-space character following (i.e., it must be the end of string or a space)
				 */
		    }
		};
	}



	/*
	 * Updates the times for our current set of localities and then redraws their rings.
	 */
	function updateLocalityTimes() {
		for (var idxNbr = 0, lenNbr = _localities.length; idxNbr < lenNbr; idxNbr++) {
			var locality = _localities[idxNbr];
			var solarTimes = SolarCalculator.Calculate(locality.latitude, locality.longitude, _yearNbr, _monthNbr, _dateNbr);

			locality.noon = solarTimes.noonTimeTxt;
			locality.sunrise = solarTimes.sunriseTimeTxt;
			locality.sunset = solarTimes.sunsetTimeTxt;

			_localities[idxNbr] = locality;
		}

		createLocalityRings();
	}



	/*
	 * Sets the date inputs and global variables to the current UTC date.
	 */
	function setCurrentDate() {
		// Populate our date input and global variables with today.
		var date = new Date();
		_yearNbr = date.getUTCFullYear();
		_monthNbr = date.getUTCMonth() + 1;
		_dateNbr = date.getUTCDate();

		_yearElem.value = _yearNbr;
		_monthElem.value = (_monthNbr < 10) ? "0" + _monthNbr.toString() : _monthNbr.toString();
		_dateElem.value = (_dateNbr < 10) ? "0" + _dateNbr.toString() : _dateNbr.toString();
	}



	/*
	 * Creates the time zone map.
	 */
	function createTimeZoneMap() {
		var svg = d3.select("#timeZonesMap")
		    .attr("width", MAP_NBRS.WIDTH)
		    .attr("height", MAP_NBRS.HEIGHT);

		var color = d3.scale.ordinal()
			.domain(TIMEZONE_OFFSETS_DOMAIN)
			.range(colorbrewer.Pastel1[10]);

		// Define the projection from spherical to Cartesian coordinates
		var projection = d3.geo.equirectangular()
		    .scale(MAP_NBRS.SCALE)
		    .translate([MAP_NBRS.WIDTH / 2, MAP_NBRS.HEIGHT / 2])
		    .precision(0.1);

		// Define the path generator
		var path = d3.geo.path();
		path.projection(projection);

		// Create a g container group in order to perform transformations on everything within the group.
		var svgGroup = svg.append("g")

		var zoomBehavior = d3.behavior.zoom()
			.translate([0,0])
			.scale(1)
			.scaleExtent([1,5])
			.on("zoom", function() {
				svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
				svgGroup.select(".antarcticaBorder").style("stroke-width", STROKE_WIDTH_NBRS.ANTARCTICA/d3.event.scale + "px");
				svgGroup.select(".timezoneBorder").style("stroke-width", STROKE_WIDTH_NBRS.TIMEZONE/d3.event.scale + "px");
				svgGroup.select(".graticule").style("stroke-width", STROKE_WIDTH_NBRS.GRATICULE/d3.event.scale + "px");
			});

		svg.call(zoomBehavior);

		// Create a tooltip
		var tooltip = document.createElement("div");
		tooltip.id = "tooltip";
		document.getElementsByTagName("body")[0].appendChild(tooltip);

		// Load our topojson data
		d3.json("data/tz_world.topojson", function(error, tzJson) {
			var timezones = topojson.feature(tzJson, tzJson.objects.tz_world_mp).features;

			toggleLoadingImg();

			// Append an SVG path element using the graticule function to create SVG lines for meridians and parallels
			var graticule = d3.geo.graticule();
			svgGroup.append("path")
			    .datum(graticule)
			    .attr("class", "graticule")
			    .attr("d", path);
		    
		    svgGroup.selectAll(".timezone")
				.data(timezones)
				.enter().append("path")
				.attr("d", path)
				.attr("id", function(inpDatum) { return inpDatum.id })
				.style("fill", function(inpDatum) {
						if (inpDatum.id == "uninhabited") {
							// Color Antarctica white because we lack timezones for it
							inpDatum.color = "#FFFFFF"
						} else {
							inpDatum.color = color(inpDatum.properties.Offset);
						}
						return inpDatum.color;
					})
				.on("mouseover", function(inpDatum) {
						tooltip.style.visibility = "visible";
						if (inpDatum.id == "uninhabited") {
							tooltip.innerHTML = "Varied";
						} else {
							tooltip.innerHTML = inpDatum.id + " (" + inpDatum.properties.Offset + ")";
						}
						d3.select(d3.event.target).style("fill", HIGHTLIGHT_COLOR);
					})
				.on("mouseout", function(inpDatum) {
						tooltip.style.visibility = "hidden";
						d3.select(d3.event.target).style("fill", inpDatum.color);
					})
				.on("mousemove", function() {
						tooltip.style.top = d3.event.pageY - 40 + "px";
						tooltip.style.left = d3.event.pageX - (tooltip.offsetWidth/2) + "px";

						if (tooltip.offsetLeft + (tooltip.offsetWidth) > MAP_NBRS.WIDTH) {
							tooltip.style.left = MAP_NBRS.WIDTH - tooltip.offsetWidth - 10 + "px";
						} else if (tooltip.offsetLeft < 0) {
							tooltip.style.left = "10px";
						}
				});

		    // Create an outline for Antarctica
			svgGroup.append("path")
				.datum(topojson.mesh(tzJson, tzJson.objects.tz_world_mp, function(a, b) { return a.id == "uninhabited"; }))
				.attr("class", "antarcticaBorder")
				.attr("d", path);

		    // Put a stroke on intertior borders as well as for the Africa/Cairo zone, which for some reason does not share the same arc with 
		    // Africa/Tripoli in our topojson.
			svgGroup.append("path")
				.datum(topojson.mesh(tzJson, tzJson.objects.tz_world_mp, function(a, b) { return a !== b || a.id === "Africa/Cairo"; }))
				.attr("class", "timezoneBorder")
				.attr("d", path);

		});
	}



	/*
	 * Creates the "relative time" tool.
	 */
	function createRelativeTimeTool() {
		_yearElem = document.getElementById("year");
		_monthElem = document.getElementById("month");
		_dateElem = document.getElementById("date");

		setCurrentDate();


		_locInputElem = document.getElementById("locationInput");
		_locInputElem.placeholder = INPUT_TXT.ENABLED;

		_timeTool = d3.select("#relativeTimeClock")
			.attr("width", CLOCK_NBRS.WIDTH)
		    .attr("height", CLOCK_NBRS.HEIGHT);

		var clockRadiusNbr = CLOCK_NBRS.HEIGHT/2;
		var majorMarkOuterRadiusNbr = clockRadiusNbr * 0.8;

		// Draw Hours
		for(var cnt = 1; cnt <= 24; cnt++) {
		    var degreesNbr = cnt * (360/24);

		    var markOuterRadiusNbr = majorMarkOuterRadiusNbr;
		    var markInnerRadiusNbr = majorMarkOuterRadiusNbr * 0.9;

		    if (cnt % CLOCK_NBRS.MAJOR_MARK_INTERVAL > 0) {
		    	markOuterRadiusNbr = markOuterRadiusNbr - ((markOuterRadiusNbr - markInnerRadiusNbr) * 0.9);
		    }

		    var coords1 = convertPolarToCartesian(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2, markOuterRadiusNbr, degreesNbr);
		    var coords2 = convertPolarToCartesian(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2, markInnerRadiusNbr, degreesNbr);

		    _timeTool.append("svg:line")
		    	.attr("x1", coords1.x)
		    	.attr("y1", coords1.y)
		    	.attr("x2", coords2.x)
		    	.attr("y2", coords2.y)
		    	.attr("class", "hourMark");


		    if (cnt % CLOCK_NBRS.MAJOR_MARK_INTERVAL === 0) {
			    var textCoords = convertPolarToCartesian(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2,  clockRadiusNbr * 0.9, degreesNbr);
			    
			    _timeTool.append("svg:text")
			    	.attr("x", textCoords.x)
			    	.attr("y", textCoords.y)
			    	.text(cnt)
			    	.attr("text-anchor", "middle")
			    	.attr("dominant-baseline", "central")
			    	.attr("class", "hourTxt");
		    }
		}


		// A group for the clock's content so that we can delete and refresh it easily.
		_clockContentGroup = _timeTool.append("g");


		if (navigator.geolocation) {
			var options = {
				timeout: 2000
			};

			// The callback is not getting called in Firefox for some reason...
			navigator.geolocation.getCurrentPosition(initRelativeTimeTool, initRelativeTimeTool, options);
		} else {
			initRelativeTimeTool(_defaultLoc);
		}
	}



	/*
	 * Initializes the relative time clock with a locality ring representing the user's location if possible, otherwise Chicago.
	 */
	function initRelativeTimeTool(inpDefaultPosition) {
		_defaultLoc = (inpDefaultPosition !== undefined && inpDefaultPosition.coords !== undefined) ? inpDefaultPosition.coords : _defaultLoc;
		
		retrieveLocData(0, _defaultLoc);
	}


	/*
	 * Retrieves data for a location.
	 *
	 * @inpQueryTypeFlag - 0 for coordinates to address; 1 for address to coordinates
	 * @inpQueryData - coordinates should be passed as {latitude: 90.12451, longitude: -32.8751}; addresses as strings
	 */
	function retrieveLocData(inpQueryTypeFlag, inpQueryData) {
		var reqObj;

		if (inpQueryTypeFlag === 0) {
			var latLng = new google.maps.LatLng(inpQueryData.latitude, inpQueryData.longitude);
			reqObj = {latLng: latLng};
		} else {
			reqObj = {address: inpQueryData};
		}

		_geocoder.geocode(reqObj, function(inpResults, inpStatus) {

			switch(inpStatus) {
				case google.maps.GeocoderStatus.OK:
					_locInputElem.style.backgroundColor = "";

			    	var localityResult;
			    	for (var idxNbr = 0, lenNbr = inpResults.length; idxNbr < lenNbr; idxNbr++) {
			    		if (inpResults[idxNbr].types[0] == "locality") {
			    			localityResult = inpResults[idxNbr];
			    			break;
			    		} else if (inpResults[idxNbr].types[0] == "administrative_area_level_1") {
			    			localityResult = inpResults[idxNbr];
			    		}
			    	}

			    	if (!localityResult) {
			    		localityResult = inpResults[0];
			    	}

			    	var name = localityResult.formatted_address;

			    	if (name.length > RING_NBRS.MAX_LABEL_CHARS) {
			    		var componentsLenNbr = localityResult.address_components.length;

			    		name = localityResult.address_components[0].long_name + ", " + localityResult.address_components[componentsLenNbr - 1].long_name;
			    	}

			        if (_localities.indexOf(name) === -1) {
			        	var coords = localityResult.geometry.location;

			        	var solarTimes = SolarCalculator.Calculate(coords.lat(), coords.lng(), _yearNbr, _monthNbr, _dateNbr);

			        	var locality = {name: name, latitude: coords.lat(), longitude: coords.lng(), noon: solarTimes.noonTimeTxt, sunrise: solarTimes.sunriseTimeTxt, sunset: solarTimes.sunsetTimeTxt};

			        	_localities.push(locality);

			        	if (_localities.length >= RING_NBRS.MAX) {
							_locInputElem.disabled = true;
							_locInputElem.placeholder = INPUT_TXT.DISABLED;
						} else {
							_locInputElem.disabled = false;
							_locInputElem.placeholder = INPUT_TXT.ENABLED;
						}

			        	createLocalityRings();
			        }

			        break;
			    case google.maps.GeocoderStatus.ZERO_RESULTS:
			    	_locInputElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
			    	_locInputElem.placeholder = INPUT_TXT.NO_RESULTS;

			    	break;
			    case google.maps.GeocoderStatus.OVER_QUERY_LIMIT:
			    	_locInputElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
			    	_locInputElem.placeholder = INPUT_TXT.LIMIT;

			    	break;
			    case google.maps.GeocoderStatus.REQUEST_DENIED:
			    	_locInputElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
					_locInputElem.placeholder = INPUT_TXT.DENIED;

					break;
				case google.maps.GeocoderStatus.INVALID_REQUEST:
					_locInputElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
					_locInputElem.placeholder = INPUT_TXT.INVALID;

					break;
				default:
					_locInputElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
					_locInputElem.placeholder = INPUT_TXT.SERVER;

					break;
			}		
		});
	}



	/*
	 * Creates rings to represent each of our current localities.
	 */
	function createLocalityRings () {

		_localities.sort( function(a, b) {
			if (a.sunrise < b.sunrise) {
				return -1;
			} else if (a.sunrise > b.sunrise) {
				return 1;
			} else {
				return 0;
			}
		});

		clearClockContent();

		var radiusNbr = RING_NBRS.INIT_INNER_RADIUS;

		for (var idxNbr = 0, lenNbr = _localities.length; idxNbr < lenNbr; idxNbr++) {
			var locality = _localities[idxNbr];
			var radiusNbr = RING_NBRS.INIT_INNER_RADIUS - (idxNbr * (RING_NBRS.ARC_MARGIN + RING_NBRS.ARC_WIDTH));

			var sunriseTxt = locality.sunrise;
			var sunsetTxt = locality.sunset;

			if (sunriseTxt.indexOf(" ") > -1) {
				sunriseTxt = sunriseTxt.substr(0, sunriseTxt.indexOf(" "));
			}
			if (sunsetTxt.indexOf(" ") > -1) {
				sunsetTxt = sunsetTxt.substr(0, sunsetTxt.indexOf(" "));
			}

			createLocalityRing(sunriseTxt, locality.noon, sunsetTxt, radiusNbr, locality.name, locality.latitude);
		}


		// A hande to show the current time. We build this here because SVG elements are ordered by how they appear in the document.
		_clockContentGroup.append("svg:rect")
			.attr("id", "clockHand")
			.attr("x", CLOCK_NBRS.WIDTH/2 - CLOCK_NBRS.HAND_WIDTH/2)
			.attr("y", CLOCK_NBRS.HEIGHT/2)
			.attr("width",  CLOCK_NBRS.HAND_WIDTH)
			.attr("height", CLOCK_NBRS.HEIGHT/2 - 100);
		}



	/*
	 * Removes the locality SVG elements.
	 */
	function clearClockContent() {
		var groupElem = _clockContentGroup[0][0]; // We need to go two arrays in to get the DOM element due to D3's selection design.

		while (groupElem.lastChild) {
			groupElem.removeChild(groupElem.lastChild);
		}
	}



	/*
	 * Creates a ring for a locality.
	 */
	function createLocalityRing(inpSunriseTimeTxt, inpNoonTimeTxt, inpSunsetTimeTxt, inpInnerRadiusLenNbr, inpLabelTxt, inpLocalityLatitudeDegNbr) {
		var activeAMRadianNbr = convertTimeToRadianNbr(CLOCK_NBRS.ACTIVE_AM_HOURS.toString() + ":00");
		var activePMRadianNbr = convertTimeToRadianNbr(CLOCK_NBRS.ACTIVE_PM_HOURS.toString() + ":00");

		var activeStartRadianNbr = convertTimeToRadianNbr(inpNoonTimeTxt) - activeAMRadianNbr;
		var activeEndRadianNbr = convertTimeToRadianNbr(inpNoonTimeTxt) + activePMRadianNbr;
		var sunlightStartRadianNbr = convertTimeToRadianNbr(inpSunriseTimeTxt);
		var sunlightEndRadianNbr = convertTimeToRadianNbr(inpSunsetTimeTxt);


		if (activeEndRadianNbr < activeStartRadianNbr) {
			activeStartRadianNbr = -(2*Math.PI - activeStartRadianNbr);
		}
		if (sunlightEndRadianNbr < sunlightStartRadianNbr) {
			sunlightStartRadianNbr = -(2*Math.PI - sunlightStartRadianNbr);
		}

		// Account for extreme latitude places that experience 24 hours of light/dark during parts of the year. 
		if (sunlightStartRadianNbr === 0 && sunlightEndRadianNbr === 0) {
			if (inpLocalityLatitudeDegNbr > 0) {
				if (_monthNbr >= 3 && _monthNbr <= 9) {
					sunlightEndRadianNbr = 2*Math.PI;
				}
			} else {
				if (_monthNbr < 3 && _monthNbr > 9) {
					sunlightEndRadianNbr = 2*Math.PI;
				}
			}
		}

		var innerRadiusLenNbr = inpInnerRadiusLenNbr;
		var outerRadiusLenNbr = inpInnerRadiusLenNbr + RING_NBRS.ARC_WIDTH;

		var activeHoursArc = d3.svg.arc()
			.innerRadius(innerRadiusLenNbr - RING_NBRS.ACTIVE_HOURS_ARC_MARGIN)
			.outerRadius(outerRadiusLenNbr + RING_NBRS.ACTIVE_HOURS_ARC_MARGIN)
			.startAngle(activeStartRadianNbr)
			.endAngle(activeEndRadianNbr);

		_clockContentGroup.append("path")
			.attr("class", "arcActive")
			.attr("d", activeHoursArc)
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + CLOCK_NBRS.HEIGHT/2 + ")");

		var sunlightArc = d3.svg.arc()
			.innerRadius(innerRadiusLenNbr)
			.outerRadius(outerRadiusLenNbr)
			.startAngle(sunlightStartRadianNbr)
			.endAngle(sunlightEndRadianNbr);

		_clockContentGroup.append("path")
			.attr("class", "arcLight")
			.attr("d", sunlightArc)
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + CLOCK_NBRS.HEIGHT/2 + ")");

		var nightArc = d3.svg.arc()
			.innerRadius(innerRadiusLenNbr)
			.outerRadius(outerRadiusLenNbr)
			.startAngle(-(2*Math.PI - sunlightEndRadianNbr))
			.endAngle(sunlightStartRadianNbr);

		_clockContentGroup.append("path")
			.attr("class", "arcNight")
			.attr("d", nightArc)
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + CLOCK_NBRS.HEIGHT/2 + ")");


		// Label this ring.
		var labelArc = d3.svg.arc()
			.innerRadius(outerRadiusLenNbr + RING_NBRS.ACTIVE_HOURS_ARC_MARGIN + 2)
			.outerRadius(outerRadiusLenNbr + RING_NBRS.ACTIVE_HOURS_ARC_MARGIN + 2)
			.startAngle(-Math.PI)
			.endAngle(Math.PI);
		
		var ringIdTxt = inpLabelTxt.split(" ").join("");

		_clockContentGroup.append("path")
			.attr("id", ringIdTxt)
			.attr("d", labelArc)
			.attr("visibility", "hidden")
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + CLOCK_NBRS.HEIGHT/2 + ")");

		var label = _clockContentGroup.append("text")
			.attr("text-anchor", "middle");

		label.append("textPath")
			.attr("class", "arcLabel")
			.attr("xlink:href", "#" + ringIdTxt)
			.attr("startOffset", "25%")  // d3 creates an annulus rather than a true arc, so we set this offset to 25% to center it on the long edge.
			.text(inpLabelTxt);
	}



	/*
	 * Toggle the loading .gif.
	 */
	function toggleLoadingImg() {
		var img = document.getElementById("loadingImg");

		img.style.visibility = (img.style.visibility === "hidden") ? "visible" : "hidden";
	}



	/*
	 * Creates the animation loop.
	 */
	function animate() {
		// Rendering loop.
		window.requestAnimationFrame(animate);
		render();
	}



	/*
	 * Renders any animations.
	 */
	function render() {
		updateCurrDateAndTime();
	}



	/*
	 * Updates the current date and time
	 */
	function updateCurrDateAndTime() {
		var date = new Date();
		_utcDateElem.innerHTML = MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
		_utcTimeElem.innerHTML = formatTime(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

		if (_timeSetInd) {
			date.setUTCHours();
			date.setUTCMinutes();
		}

		d3.select("#clockHand")
			.attr("transform", "rotate(" + convertTimeToDegNbr(date) + " " + (CLOCK_NBRS.WIDTH/2 - CLOCK_NBRS.HAND_WIDTH/2) + " " + CLOCK_NBRS.HEIGHT/2 + ")");
	}



	/*
	 * Formats a time as HH:MM:SS.
	 */
	function formatTime(inpHourNbr, inpMinuteNbr, inpSecondNbr) {
		var rtnTimeTxt = "";

		if (inpHourNbr < 10) {
			rtnTimeTxt = "0";
		}

		rtnTimeTxt += inpHourNbr.toString() + ":";

		if (inpMinuteNbr < 10) {
			rtnTimeTxt += "0";
		}

		rtnTimeTxt += inpMinuteNbr.toString() + ":";

		if (inpSecondNbr < 10) {
			rtnTimeTxt += "0";
		}

		rtnTimeTxt += inpSecondNbr.toString();

		return rtnTimeTxt;
	}



	/*
	 * Converts a string representing time (the first 5 characters of which should follow the format "HH:MM") into radians, with "00:00" at the topmost position.
	 *
	 * Note: If the parameter does not contain a colon, we will assume the desired time is 00:00.
	 */
	function convertTimeToRadianNbr(inpTimeTxt) {
		var hourAndMin = [0, 0];
		
		if (inpTimeTxt.indexOf(":") > -1) {
			hourAndMin = inpTimeTxt.split(":");
		}

		var totalMinsNbr = Number(hourAndMin[0]) * 60 + Number(hourAndMin[1]);
		return (totalMinsNbr / DAY_MINS_NBR) * 360 * (Math.PI / 180.0);
	}



	/*
	 * Converts a Date objects hour and minute into the range 0 to 360 degrees.
	 */
	function convertTimeToDegNbr(inpDateObj) {
		var date = (inpDateObj !== undefined) ? inpDateObj : new Date();

		var minutesNbr = date.getUTCMinutes() + (date.getUTCHours() * 60);

		return (minutesNbr/DAY_MINS_NBR * 360) - 180;  // We have to subtract 180 degrees because the SVG canvas has positive Y pointing down.
	}



	/*
	 * Converts polar coordinates to Cartesian.
	 */
	function convertPolarToCartesian(inpCenterXCoordNbr, inpCenterYCoordNbr, inpRadiusLenNbr, inpAngleDegNbr) {
	  var angleRadiansNbr = (inpAngleDegNbr - 90) * Math.PI / 180.0;

	  return {
	    x: inpCenterXCoordNbr + (inpRadiusLenNbr * Math.cos(angleRadiansNbr)),
	    y: inpCenterYCoordNbr + (inpRadiusLenNbr * Math.sin(angleRadiansNbr))
	  };
	}


} (window.Main = window.Main || {}) );