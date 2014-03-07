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
	var CLOCK_NBRS = {WIDTH: 0, HEIGHT: 700, MAJOR_MARK_INTERVAL: 3, HAND_WIDTH: 3, WORK_AM_HOURS: 4, WORK_PM_HOURS: 5, SLEEP_PM_HOURS: 2, SLEEP_AM_HOURS: 7};
	var ARC_X_AXIS_ROT_DEG_NBR = 0, LARGE_ARC_FLAG = 0;
	var DAY_MINS_NBR = 1440;
	var RING_NBRS = {INIT_INNER_RADIUS: 220, ARC_WIDTH: 10, WORK_HOURS_ARC_MARGIN: 2.5, ARC_MARGIN: 20, MAX: 7, MAX_LABEL_CHARS: 30};
	var INPUT_TXT = {ENABLED: 'Add a location (e.g., "Berlin")', DISABLED: "Must clear current locations", NO_RESULTS: "Could not find this location",
					LIMIT: "Try again later. Google's request limit reached.", DENIED: "Google denied this request", INVALID: "What did you do?! Invalid request.", 
					SERVER: "Server error. Try again."};
	var INPUT_COLORS = {OK: "#FFFFFF", PROBLEM: "#FF7878"};
	var GOOGLE_TIME_ZONE_URI_TXT = "https://maps.googleapis.com/maps/api/timezone/json?";


	/**********************
	 * Global variables
	 **********************/
	var _utcDateElem, _utcTimeElem, _locInputElem, _utcRadioElem, _dstBoxElem, _yearElem, _monthElem, _dateElem, _hourElem, _minuteElem, _relTimeClock, _clockContentGroup, _clockHandGroup;
	var _yearNbr, _monthNbr, _dateNbr, _hourNbr, _minuteNbr, _userSetDateInd = false, _userSetTimeInd = false, _userMovingHandInd = false;
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
		var rtnInd;
		if (!!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect) {
			rtnInd = true;
		} else {
			document.body.innerHTML = "";
			var errMsg = document.createElement('div');
			errMsg.className = "compatibilityMsg";
			errMsg.innerHTML = ['Your browser does not support <a href="http://en.wikipedia.org/wiki/Scalable_Vector_Graphics">SVG</a>.<br />','Try using <a href="https://www.google.com/intl/en/chrome/browser/">Chrome</a>.'].join('\n');
			document.body.insertBefore(errMsg, document.body.childNodes[0]);
			rtnInd = false;
		}

		return rtnInd;
	};



	/*
	 * Initializes the scene.
	 */
	Main.Init = function() {

		// Initialize timezoneJS (https://github.com/mde/timezone-js).
		// This path text handles whether the URI is local (for testing) or remote (for deployment).
		var pathTxt = (window.location.pathname.indexOf(".html") > -1) ? window.location.pathname.substr(0, window.location.pathname.lastIndexOf("/")) : "";
		timezoneJS.timezone.zoneFileBasePath = pathTxt + "/data/timeZones";

	    timezoneJS.timezone.transport = function (inpOptions) {
			var req = new XMLHttpRequest;
			req.open('GET', inpOptions.url, false);  // We will send synchronous requests.
			req.send(null);
			
			if (req.status === 200) {
				return req.responseText;
			}
	    };

	    timezoneJS.timezone.init({async: false});


		// Size the map to the current browser window size, taking into account our minimum and maximum width settings.
		MAP_NBRS.WIDTH = document.body.clientWidth;
		MAP_NBRS.HEIGHT = MAP_NBRS.WIDTH/2;
		MAP_NBRS.SCALE = ((document.body.clientWidth - BODY_NBRS.MIN_WIDTH) / (BODY_NBRS.MAX_WIDTH - BODY_NBRS.MIN_WIDTH)) * (MAP_NBRS.MAX_SCALE - MAP_NBRS.MIN_SCALE) + MAP_NBRS.MIN_SCALE;

		CLOCK_NBRS.WIDTH = MAP_NBRS.WIDTH;
		//CLOCK_NBRS.HEIGHT = MAP_NBRS.HEIGHT;  We'll allow the clock to take up a constant height.

		_utcDateElem = document.getElementById("utcDate");
		_utcTimeElem = document.getElementById("utcTime");

		_geocoder = new google.maps.Geocoder();

		extendProtypes();

		createTimeZoneMap();

		createRelativeTimeClock();

		updateCurrDateAndTime();

		animate();
	};



	/*
	 * Handles the KeyUp event of the location input box.
	 */
	Main.HandleLocationInputOnKeyUp = function(inpEvent) {
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
	 * Handles the changing of the time reference (UTC vs local)
	 */
	Main.HandleTimeRadioChange = function() {
		setDate(true);
		setTime(true);
		updateLocalityTimes();
	}



	/*
	 * Handles the changing of the DST option.
	 */
	Main.HandleDSTChange = function() {
		updateLocalityTimes();
	}



	/*
	 * Handles the click event of the Today button.
	 */
	Main.HandleTodayButtonClick = function() {
		_userSetDateInd = false;

		setDate(false);
		updateLocalityTimes();
	}



	/*
	 * Handles the click event of the Now button.
	 */
	Main.HandleNowButtonClick = function() {
		_userSetTimeInd = false;

		setTime(false);
	}



	/*
	 * Handles the OnKeyUp event of date input boxes.
	 */
	Main.HandleDateOnKeyUp = function(inpEvent) {
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
			_userSetDateInd = true;

			var yearNbr = parseInt(_yearElem.value);
			if (yearNbr < 1) {
				yearNbr = 1;
			} else if (yearNbr > 3000) {
				yearNbr = 3000;  // 3000 is the upper year limit in the SolarCalculator.
			}
			_yearNbr = _yearElem.value = yearNbr;


			var monthNbr = parseInt(_monthElem.value);
			if (monthNbr < 1) {
				monthNbr = 1;
			} else if (monthNbr > 12) {
				monthNbr = 12;
			}
			_monthNbr = monthNbr;
			_monthElem.value = (_monthNbr < 10) ? "0" + _monthNbr.toString() : _monthNbr;


			var dateNbr = parseInt(_dateElem.value);
			if (dateNbr < 1) {
				dateNbr = 1;
			} else if (dateNbr > 31) {
				dateNbr = 31;
			}
			// This will correct the last day of February for Leap Year if needed.
			var validatedDate = SolarCalculator.ValidateDate(_yearNbr, _monthNbr, dateNbr);
			_dateNbr = parseInt(validatedDate.date);
			_dateElem.value = (_dateNbr < 10) ? "0" + _dateNbr.toString() : _dateNbr;


			updateLocalityTimes();
		}
	}



	/*
	 * Handles the OnKeyUp event of time input boxes.
	 */
	Main.HandleTimeOnKeyUp = function(inpEvent) {
		var validDataInd = true;

		if (isNaN(_hourElem.value)) {
			_hourElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
		} else {
			_hourElem.style.backgroundColor = "";
		}

		if (isNaN(_minuteElem.value)) {
			_minuteElem.style.backgroundColor = INPUT_COLORS.PROBLEM;
		} else {
			_minuteElem.style.backgroundColor = "";
		}

		if (inpEvent.keyCode == 13 && validDataInd) {
			_userSetTimeInd = true;
			var hourNbr = parseInt(_hourElem.value);
			if (hourNbr < 0 || hourNbr > 23) {
				hourNbr = 0;
			}
			_hourNbr = hourNbr;
			_hourElem.value = (_hourNbr < 10) ? "0" + _hourNbr.toString() : _hourNbr;


			var minuteNbr = parseInt(_minuteElem.value);
			if (minuteNbr < 0 || minuteNbr > 59) {
				minuteNbr = 0;
			}
			_minuteNbr = minuteNbr;
			_minuteElem.value = (_minuteNbr < 10) ? "0" + _minuteNbr.toString() : _minuteNbr;
		}
	}




	/**********************
	 * Private methods
	 **********************/

	/*
	 * Extends the prototypes of standard Javascript objects.
	 */
	function extendProtypes() {
		
		timezoneJS.Date.prototype.getStandardTimezoneOffset = function() {
			var jan = new timezoneJS.Date(this.getFullYear(), 0, 1, 0, 0, this.timezone);
			var jul = new timezoneJS.Date(this.getFullYear(), 6, 1, 0, 0, this.timezone);
			return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
		};


		timezoneJS.Date.prototype.getDSTInd = function() {
			return this.getTimezoneOffset() < this.getStandardTimezoneOffset();
		};
	}



	/*
	 * Updates the times for our current set of localities and then redraws their rings.
	 */
	function updateLocalityTimes() {
		for (var idxNbr = 0, lenNbr = _localities.length; idxNbr < lenNbr; idxNbr++) {
			var locality = _localities[idxNbr];
			var solarTimes = retrieveSolarTimes(locality.latitude, locality.longitude, _yearNbr, _monthNbr, _dateNbr);

			locality.noon = solarTimes.noonTimeTxt;
			locality.sunrise = solarTimes.sunriseTimeTxt;
			locality.sunset = solarTimes.sunsetTimeTxt;

			_localities[idxNbr] = locality;
		}

		createLocalityRings();
	}



	/*
	 * Sets the date inputs and global variables.
	 *
	 * @param inpTimeReferenceChangeInd - Boolean indicating whether or not to change the time reference (e.g. from UTC to local or vice versa).
	 */
	function setDate(inpTimeReferenceChangeInd) {
		var date = new Date();

		if (_utcRadioElem.checked) {  // We're going to set the date to UTC.
			if (_userSetDateInd) {  // We're going to use the date the user set rather than the current date.
				if (inpTimeReferenceChangeInd) {  // The current date we have is local time.
					date.setFullYear(_yearNbr);
					date.setMonth(_monthNbr - 1);
					date.setDate(_dateNbr);
				} else {  // The current date we have is UTC time.
					date.setUTCFullYear(_yearNbr);
					date.setUTCMonth(_monthNbr - 1);
					date.setUTCDate(_dateNbr);					
				}
			}

			_yearNbr = date.getUTCFullYear();
			_monthNbr = date.getUTCMonth() + 1;
			_dateNbr = date.getUTCDate();

		} else {  // We're going to set the date to local time.
			if (_userSetDateInd) {  // We're going to use the date the user set.
				if (inpTimeReferenceChangeInd) {  // The current date we have is UTC.
					date.setUTCFullYear(_yearNbr);
					date.setUTCMonth(_monthNbr - 1);
					date.setUTCDate(_dateNbr);
				} else {  // The current date we have is local time.
					date.setFullYear(_yearNbr);
					date.setMonth(_monthNbr - 1);
					date.setDate(_dateNbr);							
				}
			}
			
			_yearNbr = date.getFullYear();
			_monthNbr = date.getMonth() + 1;
			_dateNbr = date.getDate();
		}


		// A user cannot update an element if we're currently updating it in code.
		if (document.activeElement !== _yearElem) {
			_yearElem.value = _yearNbr;
		}

		if (document.activeElement !== _monthElem) {
			_monthElem.value = (_monthNbr < 10) ? "0" + _monthNbr.toString() : _monthNbr.toString();
		}

		if (document.activeElement !== _dateElem) {
			_dateElem.value = (_dateNbr < 10) ? "0" + _dateNbr.toString() : _dateNbr.toString();
		}
	}


	/*
	 * Sets the time inputs and global variables time.
	 *
	 * @param inpTimeReferenceChangeInd - Boolean indicating whether or not to change the time reference (e.g. from UTC to local or vice versa).
	 */
	function setTime(inpTimeReferenceChangeInd) {
		var date = new Date();

		if (_utcRadioElem.checked) {  // We're going to set the time to UTC.
			if (_userSetTimeInd) {  // We're going to use the time the user set rather than the current time.
				if (inpTimeReferenceChangeInd) {  // The current time we have is local time.
					date.setHours(_hourNbr);
					date.setMinutes(_minuteNbr);
				} else {  // The current time we have is UTC time.
					date.setUTCHours(_hourNbr);
					date.setUTCMinutes(_minuteNbr);				
				}
			}

			_hourNbr = date.getUTCHours();
			_minuteNbr = date.getUTCMinutes();

		} else {  // We're going to set the time to local time.
			if (_userSetTimeInd) {  // We're going to use the time the user set.
				if (inpTimeReferenceChangeInd) {  // The current time we have is UTC.
					date.setUTCHours(_hourNbr);
					date.setUTCMinutes(_minuteNbr);
				} else {  // The time we have is local time.
					date.setHours(_hourNbr);
					date.setMinutes(_minuteNbr);							
				}
			}
			
			_hourNbr = date.getHours();
			_minuteNbr = date.getMinutes();
		}


		// A user cannot update an element if we're currently updating it in code.
		if (document.activeElement !== _hourElem) {
			_hourElem.value = (_hourNbr < 10) ? "0" + _hourNbr.toString() : _hourNbr.toString();
		}

		if (document.activeElement !== _minuteElem) {
			_minuteElem.value = (_minuteNbr < 10) ? "0" + _minuteNbr.toString() : _minuteNbr.toString();
		}
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
			.scaleExtent([1, 5])
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
		document.body.appendChild(tooltip);

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
	 * Creates the "relative time" clock.
	 */
	function createRelativeTimeClock() {
		_utcRadioElem = document.getElementById("utcRadio");
		_dstBoxElem = document.getElementById("dstBox");
		_yearElem = document.getElementById("year");
		_monthElem = document.getElementById("month");
		_dateElem = document.getElementById("day");
		_hourElem = document.getElementById("hour");
		_minuteElem = document.getElementById("minute");

		setDate(false);
		setTime(false);


		_locInputElem = document.getElementById("locationInput");
		_locInputElem.placeholder = INPUT_TXT.ENABLED;

		_relTimeClock = d3.select("#relativeTimeClock")
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

		    _relTimeClock.append("svg:line")
		    	.attr("x1", coords1.x)
		    	.attr("y1", coords1.y)
		    	.attr("x2", coords2.x)
		    	.attr("y2", coords2.y)
		    	.attr("class", "hourMark");


		    if (cnt % CLOCK_NBRS.MAJOR_MARK_INTERVAL === 0) {
			    var textCoords = convertPolarToCartesian(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2,  clockRadiusNbr * 0.9, degreesNbr);
			    
			    _relTimeClock.append("svg:text")
			    	.attr("x", textCoords.x)
			    	.attr("y", textCoords.y)
			    	.text(cnt)
			    	.attr("text-anchor", "middle")
			    	.attr("dominant-baseline", "central")
			    	.attr("class", "hourTxt");
		    }
		}


		// A group for the clock's content so that we can delete and refresh it easily.
		_clockContentGroup = _relTimeClock.append("g");

		createRelativeTimeClockKey();

		if (navigator.geolocation) {
			var options = {
				timeout: 2000
			};

			// The callback is not getting called in Firefox for some reason...
			navigator.geolocation.getCurrentPosition(initRelativeTimeClock, initRelativeTimeClock, options);
		} else {
			initRelativeTimeClock(_defaultLoc);
		}
	}



	/*
	 * Creates a key for the clock.
	 */
	function createRelativeTimeClockKey() {

		var origXCoordNbr = CLOCK_NBRS.WIDTH/12;
		var origYCoordNbr = 45;
		var workWidthNbr = 60;
		var lightWidthNbr = 100;
		var nightWidthNbr = 100;
		var sleepWidthNbr = 60;
		var totWidthNbr = lightWidthNbr + nightWidthNbr;
		var textDeltaYNbr = 10;

		_relTimeClock.append("svg:rect")
			.attr("class", "arcWork")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", workWidthNbr)
			.attr("height", RING_NBRS.ARC_WIDTH + 2*RING_NBRS.WORK_HOURS_ARC_MARGIN)
			.attr("transform", "translate(" + origXCoordNbr + "," + origYCoordNbr + ")");


		var label = _relTimeClock.append("svg:text")
			.attr("class", "keyLabel")
			.attr("x", origXCoordNbr + 10)
			.attr("y", origYCoordNbr - 30)
			.text("");
		label.append("tspan")
			.text("Common");
		label.append("tspan")
			.attr("x", origXCoordNbr + 10)
			.attr("dy", textDeltaYNbr)
			.text("work hours");

		_relTimeClock.append("svg:line")
			.attr("class", "keyLine")
			.attr("x1", origXCoordNbr + 37)
			.attr("y1", origYCoordNbr - 15)
			.attr("x2", origXCoordNbr + 30)
			.attr("y2", origYCoordNbr - 3);

		_relTimeClock.append("svg:rect")
			.attr("class", "arcLight")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", lightWidthNbr)
			.attr("height", RING_NBRS.ARC_WIDTH)
			.attr("transform", "translate(" + origXCoordNbr + "," + (origYCoordNbr + RING_NBRS.WORK_HOURS_ARC_MARGIN) + ")");
		

		label = _relTimeClock.append("svg:text")
			.attr("class", "keyLabel")
			.attr("x", origXCoordNbr + 40)
			.attr("y", origYCoordNbr + 42)
			.text("");
		label.append("tspan")
			.text("Daylight");
		label.append("tspan")
			.attr("x", origXCoordNbr + 40)
			.attr("dy", textDeltaYNbr)
			.text("hours");

		_relTimeClock.append("svg:line")
			.attr("class", "keyLine")
			.attr("x1", origXCoordNbr + 63)
			.attr("y1", origYCoordNbr + 30)
			.attr("x2", origXCoordNbr + 80)
			.attr("y2", origYCoordNbr + 8);


		var xCoordNbr = origXCoordNbr + (totWidthNbr - sleepWidthNbr - 10);

		_relTimeClock.append("svg:rect")
			.attr("class", "arcSleep")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", sleepWidthNbr)
			.attr("height", RING_NBRS.ARC_WIDTH + 2*RING_NBRS.WORK_HOURS_ARC_MARGIN)
			.attr("transform", "translate(" + xCoordNbr + "," + (origYCoordNbr) + ")");


		label = _relTimeClock.append("svg:text")
			.attr("class", "keyLabel")
			.attr("x", origXCoordNbr + 100)
			.attr("y", origYCoordNbr + -30)
			.text("");
		label.append("tspan")
			.text("Night");
		label.append("tspan")
			.attr("x", origXCoordNbr + 100)
			.attr("dy", textDeltaYNbr)
			.text("hours");

		_relTimeClock.append("svg:line")
			.attr("class", "keyLine")
			.attr("x1", origXCoordNbr + 112)
			.attr("y1", origYCoordNbr - 15)
			.attr("x2", origXCoordNbr + 115)
			.attr("y2", origYCoordNbr + 1);


		xCoordNbr = origXCoordNbr + lightWidthNbr;

		_relTimeClock.append("svg:rect")
			.attr("class", "arcNight")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", nightWidthNbr)
			.attr("height", RING_NBRS.ARC_WIDTH)
			.attr("transform", "translate(" + xCoordNbr + "," + (origYCoordNbr + RING_NBRS.WORK_HOURS_ARC_MARGIN) + ")");


		label = _relTimeClock.append("svg:text")
			.attr("class", "keyLabel")
			.attr("x", origXCoordNbr + 165)
			.attr("y", origYCoordNbr + -30)
			.text("");
		label.append("tspan")
			.text("Common");
		label.append("tspan")
			.attr("x", origXCoordNbr + 165)
			.attr("dy", textDeltaYNbr)
			.text("sleep hours");

		_relTimeClock.append("svg:line")
			.attr("class", "keyLine")
			.attr("x1", origXCoordNbr + 184)
			.attr("y1", origYCoordNbr - 15)
			.attr("x2", origXCoordNbr + 170)
			.attr("y2", origYCoordNbr - 3);
	}



	/*
	 * Initializes the relative time clock with a locality ring representing the user's location if possible, otherwise Chicago.
	 */
	function initRelativeTimeClock(inpDefaultPosition) {
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

			        	var solarTimes = retrieveSolarTimes(coords.lat(), coords.lng(), _yearNbr, _monthNbr, _dateNbr);

			        	var locality = {name: name, latitude: coords.lat(), longitude: coords.lng(), noon: solarTimes.noonTimeTxt, sunrise: solarTimes.sunriseTimeTxt, sunset: solarTimes.sunsetTimeTxt};

			        	_localities.push(locality);

			        	if (_localities.length >= RING_NBRS.MAX) {
							_locInputElem.disabled = true;
							_locInputElem.placeholder = INPUT_TXT.DISABLED;
						} else {
							_locInputElem.disabled = false;
							_locInputElem.placeholder = INPUT_TXT.ENABLED;
						}

						var req = new XMLHttpRequest;
						req.overrideMimeType("application/json");
						var locationTxt = "location=" + locality.latitude + "," + locality.longitude;
						var date = new Date(_yearNbr, _monthNbr - 1, _dateNbr, _hourNbr, _minuteNbr, 0, 0);
						var timestampTxt = "&timestamp=" + (date.getTime()/1000);
						var sensorTxt = "&sensor=false";
						req.open('GET', GOOGLE_TIME_ZONE_URI_TXT + locationTxt + timestampTxt + sensorTxt, true);
						req.onload  = function() {
							if (req.readyState === 4 && req.status === 200) {
								var json = JSON.parse(req.responseText);
						    	locality.timeZoneId = json.timeZoneId;
							} else {
								locality.timeZoneId = "";
							}

							createLocalityRings();
						};
						req.send(null);
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
	 * Retrieve solar times.
	 */
	function retrieveSolarTimes(inpLatitudeDegNbr, inpLongitudeDegNbr, inpYearNbr, inpMonthNbr, inpDateNbr) {

		var utcOffsetNbr = 0;

		if (_utcRadioElem.checked === false) {
			// We're using local time as our reference, so we need to calculate solar times with reference to that.
			var date = new Date(_yearNbr, _monthNbr - 1, _dateNbr, 0, 0, 0);
			utcOffsetNbr = -date.getTimezoneOffset() / 60;  // Pass the UTC offset as a fraction of an hour, either positive or negative.
		}

		return SolarCalculator.Calculate(inpLatitudeDegNbr, inpLongitudeDegNbr, inpYearNbr, inpMonthNbr, inpDateNbr, utcOffsetNbr);
	}


	/*
	 * Creates rings to represent each of our current localities.
	 */
	function createLocalityRings() {

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

			createLocalityRing(sunriseTxt, locality.noon, sunsetTxt, radiusNbr, locality.name, locality.latitude, locality.timeZoneId);
		}


		// A hand to show the current time. We build this here because SVG elements are ordered by how they appear in the document.
		_clockHandGroup = _clockContentGroup.append("g");

		var clockHand = _clockHandGroup.append("svg:rect")
			.attr("id", "clockHand")
			.attr("x", CLOCK_NBRS.WIDTH/2 - CLOCK_NBRS.HAND_WIDTH/2)
			.attr("y", CLOCK_NBRS.HEIGHT/2)
			.attr("width",  CLOCK_NBRS.HAND_WIDTH)
			.attr("height", CLOCK_NBRS.HEIGHT/2 - 100);

		// Add a transparent hand on top that is larger than the real hand. This will creater a larger click area for the user.
		var clickableWidthNbr = CLOCK_NBRS.HAND_WIDTH * 10;
		var clockClickableHand = _clockHandGroup.append("svg:rect")
			.attr("x", CLOCK_NBRS.WIDTH/2 - clickableWidthNbr/2)
			.attr("y", CLOCK_NBRS.HEIGHT/2)
			.attr("width",  clickableWidthNbr)
			.attr("height", CLOCK_NBRS.HEIGHT/2 - 100)
			.attr("opacity", 0.0);		

		var drag = d3.behavior.drag()
			.on("dragstart", function() {
					_userMovingHandInd = true;
				})
			.on("drag", function() {
					_userSetTimeInd = true;
					var mouseCoords = d3.mouse(_relTimeClock[0][0]);
					var mouseDegNbr =  convertCartesianToDegNbr(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2, mouseCoords[0], mouseCoords[1]);
					var timeObj = convertDegreesToTime(mouseDegNbr);

					_hourNbr = timeObj.hourNbr;
					_minuteNbr = timeObj.minuteNbr;
					setTime(false);

					_clockHandGroup.attr("transform", "rotate(" + (mouseDegNbr - 180) + " " + CLOCK_NBRS.WIDTH/2 + " " + CLOCK_NBRS.HEIGHT/2 + ")");
				})
			.on("dragend", function() {
					_userMovingHandInd = false;
				});

		_clockHandGroup.call(drag);
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
	function createLocalityRing(inpSunriseTimeTxt, inpNoonTimeTxt, inpSunsetTimeTxt, inpInnerRadiusLenNbr, inpLabelTxt, inpLocalityLatitudeDegNbr, inpTimeZoneIdTxt) {
		var dstDeltaMinutesNbr = 0;

		if (_dstBoxElem.checked) {
			var date = new Date();

			if (_utcRadioElem.checked) {
				date.setUTCFullYear(_yearNbr);
				date.setUTCMonth(_monthNbr - 1);
				date.setUTCDate(_dateNbr);	
			} else {
				date.setFullYear(_yearNbr);
				date.setMonth(_monthNbr - 1);
				date.setDate(_dateNbr);			
			}

			var tzDate = new timezoneJS.Date(date, inpTimeZoneIdTxt);

			if (tzDate.getDSTInd()) {
				dstDeltaMinutesNbr = -Math.abs(tzDate.getStandardTimezoneOffset() - tzDate.getTimezoneOffset());
				inpNoonTimeTxt = addTime(inpNoonTimeTxt, dstDeltaMinutesNbr);
			}
		}

		var workAMRadianNbr = convertTimeToRadianNbr(CLOCK_NBRS.WORK_AM_HOURS.toString() + ":00");
		var workPMRadianNbr = convertTimeToRadianNbr(CLOCK_NBRS.WORK_PM_HOURS.toString() + ":00");
		var sleepAMRadianNbr = convertTimeToRadianNbr(CLOCK_NBRS.SLEEP_AM_HOURS.toString() + ":00");
		var sleepPMRadianNbr = convertTimeToRadianNbr(CLOCK_NBRS.SLEEP_PM_HOURS.toString() + ":00");

		var solarMidnightTxt = addTime(inpNoonTimeTxt, 12*60);

		var workStartRadianNbr = convertTimeToRadianNbr(inpNoonTimeTxt) - workAMRadianNbr;
		var workEndRadianNbr = convertTimeToRadianNbr(inpNoonTimeTxt) + workPMRadianNbr;
		var sleepStartRadianNbr = convertTimeToRadianNbr(solarMidnightTxt) - sleepPMRadianNbr;
		var sleepEndRadianNbr = convertTimeToRadianNbr(solarMidnightTxt) + sleepAMRadianNbr;
		var sunlightStartRadianNbr = convertTimeToRadianNbr(inpSunriseTimeTxt);
		var sunlightEndRadianNbr = convertTimeToRadianNbr(inpSunsetTimeTxt);


		if (workEndRadianNbr < workStartRadianNbr) {
			workStartRadianNbr = -(2*Math.PI - workStartRadianNbr);
		}
		if (sleepEndRadianNbr < sleepStartRadianNbr) {
			sleepStartRadianNbr = -(2*Math.PI - sleepStartRadianNbr);
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
			.innerRadius(innerRadiusLenNbr - RING_NBRS.WORK_HOURS_ARC_MARGIN)
			.outerRadius(outerRadiusLenNbr + RING_NBRS.WORK_HOURS_ARC_MARGIN)
			.startAngle(workStartRadianNbr)
			.endAngle(workEndRadianNbr);

		_clockContentGroup.append("path")
			.attr("class", "arcWork")
			.attr("d", activeHoursArc)
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + CLOCK_NBRS.HEIGHT/2 + ")");

		var sleepHoursArc = d3.svg.arc()
			.innerRadius(innerRadiusLenNbr - RING_NBRS.WORK_HOURS_ARC_MARGIN)
			.outerRadius(outerRadiusLenNbr + RING_NBRS.WORK_HOURS_ARC_MARGIN)
			.startAngle(sleepStartRadianNbr)
			.endAngle(sleepEndRadianNbr);

		_clockContentGroup.append("path")
			.attr("class", "arcSleep")
			.attr("d", sleepHoursArc)
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
			.innerRadius(outerRadiusLenNbr + RING_NBRS.WORK_HOURS_ARC_MARGIN + 2)
			.outerRadius(outerRadiusLenNbr + RING_NBRS.WORK_HOURS_ARC_MARGIN + 2)
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

		// Update the title header time.
		var date = new Date();
		_utcDateElem.innerHTML = MONTHS[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
		_utcTimeElem.innerHTML = formatTime(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

		if (_userSetDateInd === false) {
			setDate(false);
		}
		if (_userSetTimeInd === false) {
			setTime(false);
		}

		if (_userMovingHandInd === false) {
			if (_clockHandGroup) {
				_clockHandGroup.attr("transform", "rotate(" + convertTimeToDegNbr(_hourNbr, _minuteNbr) + " " + CLOCK_NBRS.WIDTH/2 + " " + CLOCK_NBRS.HEIGHT/2 + ")");
			}
		}
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
	 * Adds/subtracts the indicated number of minutes to the passed base time.
	 * The output range is 00:00 to 23:59.
	 *
	 * @param inpBaseTimeTxt - Base time in format HH:MM
	 * @param inpToAddMinutesNbr - Number of minutes to add to the base time
	 */
	function addTime(inpBaseTimeTxt, inpToAddMinutesNbr) {
		var hourAndMin = inpBaseTimeTxt.split(":");

		var totalMinsNbr = Number(hourAndMin[0]) * 60 + Number(hourAndMin[1]) + inpToAddMinutesNbr;

		var newMinsNbr = totalMinsNbr % DAY_MINS_NBR;

		var hoursNbr = Math.floor(newMinsNbr / 60);
		var minutesNbr = newMinsNbr - (hoursNbr * 60);

		return hoursNbr + ":" + minutesNbr;
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
	 * Converts hour and minute into the range 0 to 360 degrees.
	 */
	function convertTimeToDegNbr(inpHourNbr, inpMinuteNbr) {
		var minutesNbr = inpMinuteNbr + (inpHourNbr * 60);

		return (minutesNbr/DAY_MINS_NBR * 360) - 180;  // We have to subtract 180 degrees because the SVG canvas has positive Y pointing down.
	}



	/*
	 * Converts polar coordinates to Cartesian.
	 */
	function convertPolarToCartesian(inpOriginXCoordNbr, inpOriginYCoordNbr, inpRadiusLenNbr, inpAngleDegNbr) {
	  var angleRadiansNbr = (inpAngleDegNbr - 90) * Math.PI / 180.0;

	  return {
	    x: inpOriginXCoordNbr + (inpRadiusLenNbr * Math.cos(angleRadiansNbr)),
	    y: inpOriginYCoordNbr + (inpRadiusLenNbr * Math.sin(angleRadiansNbr))
	  };
	}



	/*
	 * Converts Cartesian coordinates to a degree number away from an origin.
	 */
	function convertCartesianToDegNbr(inpOriginXCoordNbr, inpOriginYCoordNbr, inpXCoordNbr, inpYCoordNbr) {
		// Normalize the mouse coordinates to an origin of 0,0.
		inpXCoordNbr -= inpOriginXCoordNbr;
		inpYCoordNbr -= inpOriginYCoordNbr;

		var upVectorMagnitudeNbr = inpOriginYCoordNbr;
		var mouseVectorMagnitudeNbr = Math.sqrt((inpXCoordNbr*inpXCoordNbr) + (inpYCoordNbr*inpYCoordNbr));

		// Note: The X component of the up vector is 0, so we only have to multiply the Y components.
		var dotProdNbr = inpOriginYCoordNbr * -inpYCoordNbr;
		
		// Have to account for what side of the Y axis we're on so that we can get both positive and negative degree values.
		var xSignNbr = (inpXCoordNbr < 0) ? -1 : 1;

		return Math.acos(dotProdNbr/(upVectorMagnitudeNbr * mouseVectorMagnitudeNbr)) * (180/Math.PI) * xSignNbr;
	}



	/*
	 * Converts a degree number to time.
	 */
	function convertDegreesToTime(inpDegNbr) {
		var totMinutesNbr = (inpDegNbr / 360) * DAY_MINS_NBR;

		var rtnObj = {};
		rtnObj.hourNbr = Math.floor(totMinutesNbr / 60);
		rtnObj.minuteNbr = Math.floor(totMinutesNbr - (rtnObj.hourNbr * 60));

		return rtnObj;
	}

// Self-execute the function. If the Window.Main namespace already exists, use it; otherwise set it to an object.
}) (window.Main = window.Main === undefined ? {} : window.Main);