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
	var CLOCK_NBRS = {WIDTH: 0, HEIGHT: 0, MARK_CNT: 8};
	var ARC_X_AXIS_ROT_DEG_NBR = 0, LARGE_ARC_FLAG = 0;
	var DAY_MINS_NBR = 1440;
	var RING_NBRS = {INIT_RADIUS: 175, ARC_WIDTH: 10, ARC_MARGIN: 5};


	/**********************
	 * Global variables
	 **********************/
	var _utcDateElem, _utcTimeElem, _timeTool;
	var _localities = [];
	var _defaultLoc = {latitude: 41.85, longitude: -87.649999};  // Default to Chicago.
	var _geocoder;


	/**********************
	 * Public methods
	 **********************/

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
		CLOCK_NBRS.HEIGHT = MAP_NBRS.HEIGHT;

		_utcDateElem = document.getElementById("utcDate");
		_utcTimeElem = document.getElementById("utcTime");

		_geocoder = new google.maps.Geocoder();

		updateCurrDateAndTime();

		createTimeZoneMap();

		createRelativeTimeTool();

		animate();
	};




	/**********************
	 * Private methods
	 **********************/

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
		var svgGroup = svg.append("g");

		var zoomBehavior = d3.behavior.zoom()
			.translate([0,0])
			.scale(1)
			.scaleExtent([1,12])
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
		d3.json("/data/tz_world.topojson", function(error, tzJson) {
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
	 *
	 */
	function createRelativeTimeTool() {
		_timeTool = d3.select("#relativeTimeClock")
			.attr("width", CLOCK_NBRS.WIDTH)
		    .attr("height", CLOCK_NBRS.HEIGHT);

		var clockRadiusNbr = CLOCK_NBRS.HEIGHT/2;
		var markOuterRadiusNbr = clockRadiusNbr * 0.8;

		// Draw Hours
		for(var idxNbr = 0; idxNbr < CLOCK_NBRS.MARK_CNT; idxNbr++) {
		    var degreesNbr = idxNbr * (360/CLOCK_NBRS.MARK_CNT);
		    
		    var coords1 = convertPolarToCartesian(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2, markOuterRadiusNbr, degreesNbr);
		    var coords2 = convertPolarToCartesian(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2, markOuterRadiusNbr * 0.9, degreesNbr);

		    _timeTool.append("svg:line")
		    	.attr("x1", coords1.x)
		    	.attr("y1", coords1.y)
		    	.attr("x2", coords2.x)
		    	.attr("y2", coords2.y)
		    	.attr("class", "hourMark");

		    var textCoords = convertPolarToCartesian(CLOCK_NBRS.WIDTH/2, CLOCK_NBRS.HEIGHT/2,  clockRadiusNbr * 0.9, degreesNbr);

		    var hourNbr = idxNbr * 24/CLOCK_NBRS.MARK_CNT;
		    hourNbr = (hourNbr === 0) ? 24 : hourNbr;
		    
		    _timeTool.append("svg:text")
		    	.attr("x", textCoords.x)
		    	.attr("y", textCoords.y)
		    	.text(hourNbr)
		    	.attr("text-anchor", "middle")
		    	.attr("dominant-baseline", "central")
		    	.attr("class", "hourTxt");
		}

		if (navigator.geolocation) {
			var options = {
				timeout: 2000
			};

			navigator.geolocation.getCurrentPosition(initRelativeTimeTool, initRelativeTimeTool, options);
		} else {
			initRelativeTimeTool(_defaultLoc);
		}
	}



	function initRelativeTimeTool(inpDefaultPosition) {
		_defaultLoc = (inpDefaultPosition !== "undefined" && inpDefaultPosition.coords.latitude !== "undefined") ? inpDefaultPosition.coords : _defaultLoc;
		
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
		    if (inpStatus == google.maps.GeocoderStatus.OK) {

		    	var localityResult;
		    	for (var idxNbr = 0, lenNbr = inpResults.length; idxNbr < lenNbr; idxNbr++) {
		    		if (inpResults[idxNbr].types[0] == "locality") {
		    			localityResult = inpResults[idxNbr];
		    			break;
		    		}
		    	}

		        if (_localities.indexOf(localityResult.formatted_address) === -1) {
		        	var coords = localityResult.geometry.location;
		        	_localities[localityResult.formatted_address] = {latitude: coords.nb, longitude: coords.ob};

		        	var solarTimes = SolarCalculator.Calculate(coords.nb, coords.ob);
		        	createLocalityRing(solarTimes.sunriseTimeTxt, solarTimes.sunsetTimeTxt, RING_NBRS.INIT_RADIUS, localityResult.formatted_address);
		        }
		    } else {
		    	// error
		    }
		});
	}



	function createLocalityRing(inpSunriseTimeTxt, inpSunsetTimeTxt, inpInnerRadiusLenNbr, inpLabelTxt) {
		var sunlightStartRadianNbr = convertTimeToRadianNbr(inpSunriseTimeTxt);
		var sunlightEndRadianNbr = convertTimeToRadianNbr(inpSunsetTimeTxt);

		var innerRadiusLenNbr = inpInnerRadiusLenNbr;
		var outerRadiusLenNbr = inpInnerRadiusLenNbr + RING_NBRS.ARC_WIDTH;

		var sunlightArc = d3.svg.arc()
			.innerRadius(innerRadiusLenNbr)
			.outerRadius(outerRadiusLenNbr)
			.startAngle(sunlightStartRadianNbr)
			.endAngle(sunlightEndRadianNbr);

		_timeTool.append("path")
			.attr("class", "arcSun")
			.attr("d", sunlightArc)
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + 300 + ")");

		var nightArc = d3.svg.arc()
			.innerRadius(innerRadiusLenNbr)
			.outerRadius(outerRadiusLenNbr)
			.startAngle(-(2*Math.PI - sunlightEndRadianNbr))
			.endAngle(sunlightStartRadianNbr);

		_timeTool.append("path")
			.attr("class", "arcNight")
			.attr("d", nightArc)
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + 300 + ")");


		// Label this ring.
		var labelArc = d3.svg.arc()
			.innerRadius(outerRadiusLenNbr + 3)
			.outerRadius(outerRadiusLenNbr + 3)
			.startAngle(-Math.PI/2)
			.endAngle(Math.PI/2);
		
		var ringIdTxt = inpLabelTxt.split(" ").join("");

		_timeTool.append("path")
			.attr("id", ringIdTxt)
			.attr("d", labelArc)
			.attr("visibility", "hidden")
			.attr("transform", "translate(" + CLOCK_NBRS.WIDTH/2 + "," + 300 + ")");

		var label = _timeTool.append("text")
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
	 */
	function convertTimeToRadianNbr(inpTimeTxt) {
		var hourAndMin = inpTimeTxt.split(":");

		var totalMinsNbr = Number(hourAndMin[0]) * 60 + Number(hourAndMin[1]);
		return (totalMinsNbr / DAY_MINS_NBR) * 360 * (Math.PI / 180.0);
	}



	/*
	 * Creates a "d" attribute for an SVG Path in the shape of an arc.
	 */
	function describeArcPath(inpCenterXCoordNbr, inpCenterYCoordNbr, inpRadiusLenNbr, inpStartAngleDegNbr, inpEndAngleDegNbr){

	    var startPoint = convertPolarToCartesian(inpCenterXCoordNbr, inpCenterYCoordNbr, inpRadiusLenNbr, inpStartAngleDegNbr);
	    var endPoint = convertPolarToCartesian(inpCenterXCoordNbr, inpCenterYCoordNbr, inpRadiusLenNbr, inpEndAngleDegNbr);

	    var arcSweepFlag = inpEndAngleDegNbr - inpStartAngleDegNbr <= 180 ? 0 : 1;

	    var d = [
	        "M", startPoint.x, startPoint.y,
	        "A", inpRadiusLenNbr, inpRadiusLenNbr, ARC_X_AXIS_ROT_DEG_NBR, LARGE_ARC_FLAG, arcSweepFlag, endPoint.x, endPoint.y
	    ].join(" ");

	    return d;
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