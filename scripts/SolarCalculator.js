/*
 * Solar Calculator created by the National Oceanic & Atmospheric Administration.
 *
 * This uses a Self-Executing Anonymous Function to declare the namespace "SolarCalculator" and create public and private members within it.
 *
 * @author Kevin Dean (minor changes to NOAA code)
 *
 */

/*
 * @param SolarCalculator: Defines the namespace to use for public members of this class.
 * @param undefined: Nothing should be passed via this parameter. This ensures that you can use "undefined" here without worrying that another loaded
 *						script as redefined the global variable "undefined".
 */
(function(SolarCalculator, undefined) {

	/**********************
	 * Constants
	 **********************/
	var JULIAN_NBRS = {YEAR_DAYS: 365.25, DAYS_PER_MONTH_APPROX: 30.6001, FIRST_YEAR_BCE: 4716, CENTURY_DAYS: 36525.0, JAN_1_2000_DAYS: 2451545.0};
	var DAY_MINS_NBR = 1440.0;

	var _monthList = [];
	
	var i = 0;
	_monthList[i++] = new month("January", 31, "Jan");
	_monthList[i++] = new month("February", 28, "Feb");
	_monthList[i++] = new month("March", 31, "Mar");
	_monthList[i++] = new month("April", 30, "Apr");
	_monthList[i++] = new month("May", 31, "May");
	_monthList[i++] = new month("June", 30, "Jun");
	_monthList[i++] = new month("July", 31, "Jul");
	_monthList[i++] = new month("August", 31, "Aug");
	_monthList[i++] = new month("September", 30, "Sep");
	_monthList[i++] = new month("October", 31, "Oct");
	_monthList[i++] = new month("November", 30, "Nov");
	_monthList[i++] = new month("December", 31, "Dec");




	/**********************
	 * Public methods
	 **********************/

	SolarCalculator.Calculate = function(inpLatDegNbr, inpLongDegNbr, inpYearNbr, inpMonthNbr, inpDayNbr, inpUTCOffsetNbr, inpDSTInd) {
		var rtnObj = {};
		var currDate = new Date();

		inpYearNbr = (inpYearNbr != "undefined" && typeof(inpYearNbr) == "number") ? inpYearNbr : currDate.getUTCFullYear();
		inpMonthNbr = (inpMonthNbr != "undefined" && typeof(inpMonthNbr) == "number") ? inpMonthNbr : currDate.getUTCMonth() + 1;
		inpDayNbr = (inpDayNbr != "undefined" && typeof(inpDayNbr) == "number") ? inpDayNbr : currDate.getUTCDate();
		inpUTCOffsetNbr = (inpUTCOffsetNbr != "undefined" && typeof(inpUTCOffsetNbr) == "number") ? inpUTCOffsetNbr : 0.0;
		inpDSTInd = (inpDSTInd != "undefined" && typeof(inpDSTInd) == "boolean") ? inpDSTInd : false;

	    var julianDayCnt = calcJulianDayCnt(inpYearNbr, inpMonthNbr, inpDayNbr);
	    rtnObj.solarNoonTimeTxt = calcSolarNoon(julianDayCnt, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd);
	    rtnObj.sunriseTimeTxt = calcApparentSunriseSet(1, julianDayCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd);
	    rtnObj.sunsetTimeTxt = calcApparentSunriseSet(0, julianDayCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd);

	    return rtnObj;
	};




	/**********************
	 * Private methods
	 **********************/

	/*
	 * Calculates the Julian Day Count given a Gregorian date.
	 * http://quasar.as.utexas.edu/BillInfo/JulianDatesG.html
	 */
	function calcJulianDayCnt(inpYearNbr, inpMonthNbr, inpDayNbr) {
	    if ((isLeapYear(inpYearNbr)) && (inpMonthNbr == 2)) {
	        if (inpDayNbr > 29) {
	            inpDayNbr = 29;
	        }
	    } else {
	        if (inpDayNbr > _monthList[inpMonthNbr - 1].numdays) {
	            inpDayNbr = _monthList[inpMonthNbr - 1].numdays;
	        }
	    }
	    if (inpMonthNbr <= 2) {
	        inpYearNbr -= 1;
	        inpMonthNbr += 12;
	    }
	    var A = Math.floor(inpYearNbr / 100);
	    var B = 2 - A + Math.floor(A / 4);

	    return Math.floor(JULIAN_NBRS.YEAR_DAYS * (inpYearNbr + JULIAN_NBRS.FIRST_YEAR_BCE)) + Math.floor(JULIAN_NBRS.DAYS_PER_MONTH_APPROX * (inpMonthNbr + 1)) + inpDayNbr + B - 1524.5;
	}


	function isLeapYear(inpYearNbr) {
	    return ((inpYearNbr % 4 === 0 && inpYearNbr % 100 !== 0) || inpYearNbr % 400 === 0);
	}


	function calcSolarNoon(inpJulianDayNbr, inpLongNbr, inpUTCOffsetNbr, inpDSTInd) {
		inpUTCOffsetNbr = (inpUTCOffsetNbr != "undefined" && typeof(inpUTCOffsetNbr) == "number") ? inpUTCOffsetNbr : 0.0;
		inpDSTInd = (inpDSTInd != "undefined" && typeof(inpDSTInd) == "boolean") ? inpDSTInd : false;

	    var tNoon = calcTimeInJulianCenturiesSince2000(inpJulianDayNbr - inpLongNbr / 360.0);
	    var equationOfTimeMinNbr = calcEquationOfTime(tNoon);
	    var solarNoonOffsetMinNbr = 720.0 - (inpLongNbr * 4) - equationOfTimeMinNbr; // in minutes
	    var newt = calcTimeInJulianCenturiesSince2000(inpJulianDayNbr + solarNoonOffsetMinNbr / DAY_MINS_NBR);
	    equationOfTimeMinNbr = calcEquationOfTime(newt);
	    var solarNoonLocalMinNbr = 720 - (inpLongNbr * 4) - equationOfTimeMinNbr + (inpUTCOffsetNbr * 60.0); // in minutes

	    if (inpDSTInd) {
			solarNoonLocalMinNbr += 60.0;
	    }

	    while (solarNoonLocalMinNbr < 0.0) {
	        solarNoonLocalMinNbr += DAY_MINS_NBR;
	    }

	    while (solarNoonLocalMinNbr >= DAY_MINS_NBR) {
	        solarNoonLocalMinNbr -= DAY_MINS_NBR;
	    }
	    return formatTimeTxt(solarNoonLocalMinNbr, 3);
	}


	/*
	 * Converts the Julian days to Julian centuries since 2000.
	 */
	function calcTimeInJulianCenturiesSince2000(inpJulianDayNbr) {
	    var julianCenturiesNbr = (inpJulianDayNbr - JULIAN_NBRS.JAN_1_2000_DAYS) / JULIAN_NBRS.CENTURY_DAYS;
	    return julianCenturiesNbr;
	}


	/*
	 * Calculates the Apparent Sunrise or Sunset as desired and returns a string of that time.
	 *
	 * http://www.esrl.noaa.gov/gmd/grad/solcalc/glossary.html#apparentsunrise
	 *
	 * @param inpSunriseSetInd - 1 for sunrise; 0 for sunset
	 */
	function calcApparentSunriseSet(inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd) {
		var rtnTimeTxt = "";

		inpUTCOffsetNbr = (inpUTCOffsetNbr != "undefined" && typeof(inpUTCOffsetNbr) == "number") ? inpUTCOffsetNbr : 0.0;
		inpDSTInd = (inpDSTInd != "undefined" && typeof(inpDSTInd) == "boolean") ? inpDSTInd : false;

	    var timeUTC = calcSunriseSetUTC(inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr);
	    var newTimeUTC = calcSunriseSetUTC(inpSunriseSetInd, inpJulianDayCnt + timeUTC / DAY_MINS_NBR, inpLatDegNbr, inpLongDegNbr);

	    if (isNumber(newTimeUTC)) {
	        var localTimeMinuteCnt = newTimeUTC + (inpUTCOffsetNbr * 60.0);
	        //var riseT = calcTimeInJulianCenturiesSince2000(inpJulianDayCnt + newTimeUTC / DAY_MINS_NBR);
	        //var riseAz = calcAzEl(0, riseT, localTimeMinuteCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr);
	        localTimeMinuteCnt += ((inpDSTInd) ? 60.0 : 0.0);

	        if ((localTimeMinuteCnt >= 0.0) && (localTimeMinuteCnt < DAY_MINS_NBR)) {
	           rtnTimeTxt = formatTimeTxt(localTimeMinuteCnt, 2);
	        } else {
				// If the UTC offset pushes the local time into a different day than indicated by inpJulianDayCnt, we fall into this logic.
	            var julianDayCnt = inpJulianDayCnt;
	            var julianDayIncrementNbr = ((localTimeMinuteCnt < 0) ? 1 : -1);
	            while ((localTimeMinuteCnt < 0.0) || (localTimeMinuteCnt >= DAY_MINS_NBR)) {
	                localTimeMinuteCnt += (julianDayIncrementNbr * DAY_MINS_NBR);
	                julianDayCnt -= julianDayIncrementNbr;
	            }
	           rtnTimeTxt = timeDateString(julianDayCnt, localTimeMinuteCnt);
	        }
	    } else { // no sunrise/set found -- not exactly sure when we would fall into this logic
			/*
	        var dayOfYear = calcDayOfYearFromJulianDayCnt(inpJulianDayCnt);
	        var jdy;

	        if (((inpLatDegNbr > 66.4) && (dayOfYear > 79) && (dayOfYear < 267)) || ((inpLatDegNbr < -66.4) && ((dayOfYear < 83) || (dayOfYear > 263)))) { //previous sunrise/next sunset
	            if (inpSunriseSetInd) { // find previous sunrise
	                jdy = calcJulianDayCntOfNextPrevRiseSet(0, inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd);
	            } else { // find next sunset
	                jdy = calcJulianDayCntOfNextPrevRiseSet(1, inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd);
	            }
	            //document.getElementById(((inpSunriseSetInd) ? "risebox" : "setbox")).value = dayString(jdy, 0, 3);
	        } else { //previous sunset/next sunrise
	            if (inpSunriseSetInd == 1) { // find previous sunrise
	                jdy = calcJulianDayCntOfNextPrevRiseSet(1, inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd);
	            } else { // find next sunset
	                jdy = calcJulianDayCntOfNextPrevRiseSet(0, inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr, inpUTCOffsetNbr, inpDSTInd);
	            }
	            //document.getElementById(((inpSunriseSetInd) ? "risebox" : "setbox")).value = dayString(jdy, 0, 3);
	        }
	        */
	    }

	    return rtnTimeTxt;
	}


	function calcSunriseSetUTC(inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr) {
	    var t = calcTimeInJulianCenturiesSince2000(inpJulianDayCnt);
	    var eqTime = calcEquationOfTime(t);
	    var solarDec = calcSunDeclination(t);
	    var hourAngle = calcHourAngleSunrise(inpLatDegNbr, solarDec);
	    //alert("HA = " + radToDeg(hourAngle));
	    if (!inpSunriseSetInd) hourAngle = -hourAngle;
	    var delta = inpLongDegNbr + radToDeg(hourAngle);
	    var timeUTC = 720 - (4.0 * delta) - eqTime; // in minutes
	    return timeUTC;
	}


	function calcDayOfYearFromJulianDayCnt(inpJulianDayCnt) {
	    var z = Math.floor(inpJulianDayCnt + 0.5);
	    var f = (inpJulianDayCnt + 0.5) - z;
	    var A;
	    if (z < 2299161) {
	        A = z;
	    } else {
	        var alpha = Math.floor((z - 1867216.25) / 36524.25);
	        A = z + 1 + alpha - Math.floor(alpha / 4);
	    }
	    var B = A + 1524;
	    var C = Math.floor((B - 122.1) / JULIAN_NBRS.YEAR_DAYS);
	    var D = Math.floor(JULIAN_NBRS.YEAR_DAYS * C);
	    var E = Math.floor((B - D) / JULIAN_NBRS.DAYS_PER_MONTH_APPROX);
	    var day = B - D - Math.floor(JULIAN_NBRS.DAYS_PER_MONTH_APPROX * E) + f;
	    var month = (E < 14) ? E - 1 : E - 13;
	    var year = (month > 2) ? C - JULIAN_NBRS.FIRST_YEAR_BCE : C - 4715;

	    var k = (isLeapYear(year) ? 1 : 2);
	    var dayOfYear = Math.floor((275 * month) / 9) - k * Math.floor((month + 9) / 12) + day - 30;
	    return dayOfYear;
	}



	function calcJulianDayCntOfNextPrevRiseSet(next, inpSunriseSetInd, inpJulianDayCnt, inpLatDegNbr, inpLongDegNbr, tz, inpDSTInd) {
	    var julianday = inpJulianDayCnt;
	    var increment = ((next) ? 1.0 : -1.0);

	    var time = calcSunriseSetUTC(inpSunriseSetInd, julianday, inpLatDegNbr, inpLongDegNbr);
	    while (!isNumber(time)) {
	        julianday += increment;
	        time = calcSunriseSetUTC(inpSunriseSetInd, julianday, inpLatDegNbr, inpLongDegNbr);
	    }
	    var timeLocal = time + tz * 60.0 + ((inpDSTInd) ? 60.0 : 0.0);
	    while ((timeLocal < 0.0) || (timeLocal >= DAY_MINS_NBR)) {
	        var incr = ((timeLocal < 0) ? 1 : -1);
	        timeLocal += (incr * DAY_MINS_NBR);
	        julianday -= incr;
	    }
	    return julianday;
	}


	function radToDeg(angleRad) {
	    return (180.0 * angleRad / Math.PI);
	}

	function degToRad(angleDeg) {
	    return (Math.PI * angleDeg / 180.0);
	}

	function calcGeomMeanLongSun(t) {
	    var L0 = 280.46646 + t * (36000.76983 + t * (0.0003032));
	    while (L0 > 360.0) {
	        L0 -= 360.0;
	    }
	    while (L0 < 0.0) {
	        L0 += 360.0;
	    }
	    return L0; // in degrees
	}

	function calcGeomMeanAnomalySun(t) {
	    var M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
	    return M; // in degrees
	}

	function calcEccentricityEarthOrbit(t) {
	    var e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
	    return e; // unitless
	}

	function calcSunEqOfCenter(t) {
	    var m = calcGeomMeanAnomalySun(t);
	    var mrad = degToRad(m);
	    var sinm = Math.sin(mrad);
	    var sin2m = Math.sin(mrad + mrad);
	    var sin3m = Math.sin(mrad + mrad + mrad);
	    var C = sinm * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin2m * (0.019993 - 0.000101 * t) + sin3m * 0.000289;
	    return C; // in degrees
	}

	function calcSunTrueLong(t) {
	    var l0 = calcGeomMeanLongSun(t);
	    var c = calcSunEqOfCenter(t);
	    var O = l0 + c;
	    return O; // in degrees
	}


	function calcSunApparentLong(t) {
	    var o = calcSunTrueLong(t);
	    var omega = 125.04 - 1934.136 * t;
	    var lambda = o - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
	    return lambda; // in degrees
	}

	function calcMeanObliquityOfEcliptic(t) {
	    var seconds = 21.448 - t * (46.8150 + t * (0.00059 - t * (0.001813)));
	    var e0 = 23.0 + (26.0 + (seconds / 60.0)) / 60.0;
	    return e0; // in degrees
	}

	function calcObliquityCorrection(t) {
	    var e0 = calcMeanObliquityOfEcliptic(t);
	    var omega = 125.04 - 1934.136 * t;
	    var e = e0 + 0.00256 * Math.cos(degToRad(omega));
	    return e; // in degrees
	}


	function calcSunDeclination(t) {
	    var e = calcObliquityCorrection(t);
	    var lambda = calcSunApparentLong(t);

	    var sint = Math.sin(degToRad(e)) * Math.sin(degToRad(lambda));
	    var theta = radToDeg(Math.asin(sint));
	    return theta; // in degrees
	}

	/*
	 * Calculates the discrepancy between two kinds of solar time, the Apparent Solar Time and Mean Solar Time, in minutes.
	 */
	function calcEquationOfTime(t) {
	    var epsilon = calcObliquityCorrection(t);
	    var l0 = calcGeomMeanLongSun(t);
	    var e = calcEccentricityEarthOrbit(t);
	    var m = calcGeomMeanAnomalySun(t);

	    var y = Math.tan(degToRad(epsilon) / 2.0);
	    y *= y;

	    var sin2l0 = Math.sin(2.0 * degToRad(l0));
	    var sinm = Math.sin(degToRad(m));
	    var cos2l0 = Math.cos(2.0 * degToRad(l0));
	    var sin4l0 = Math.sin(4.0 * degToRad(l0));
	    var sin2m = Math.sin(2.0 * degToRad(m));

	    var Etime = y * sin2l0 - 2.0 * e * sinm + 4.0 * e * y * sinm * cos2l0 - 0.5 * y * y * sin4l0 - 1.25 * e * e * sin2m;
	    return radToDeg(Etime) * 4.0; // in minutes of time
	}

	function calcHourAngleSunrise(lat, solarDec) {
	    var latRad = degToRad(lat);
	    var sdRad = degToRad(solarDec);
	    var HAarg = (Math.cos(degToRad(90.833)) / (Math.cos(latRad) * Math.cos(sdRad)) - Math.tan(latRad) * Math.tan(sdRad));
	    var HA = Math.acos(HAarg);
	    return HA; // in radians (for sunset, use -HA)
	}

	function isNumber(inputVal) {
	    var oneDecimal = false;
	    var inputStr = "" + inputVal;
	    for (var i = 0; i < inputStr.length; i++) {
	        var oneChar = inputStr.charAt(i);
	        if (i === 0 && (oneChar == "-" || oneChar == "+")) {
	            continue;
	        }
	        if (oneChar == "." && !oneDecimal) {
	            oneDecimal = true;
	            continue;
	        }
	        if (oneChar < "0" || oneChar > "9") {
	            return false;
	        }
	    }
	    return true;
	}


	function zeroPad(n, digits) {
	    n = n.toString();
	    while (n.length < digits) {
	        n = "0" + n;
	    }
	    return n;
	}


	function month(name, numdays, abbr) {
	    this.name = name;
	    this.numdays = numdays;
	    this.abbr = abbr;
	}


	/*
	 * Returns a string in the form DDMMMYYYY[ next] to display prev/next rise/set
	 *
	 * @param inpFormatFlag - 2 for DD MMM, 3 for DD MM YYYY, 4 for DDMMYYYY next/prev
	 */
	function dayString(inpJulianDayCnt, next, inpFormatFlag) {
	    var output;
	    if ((inpJulianDayCnt < 900000) || (inpJulianDayCnt > 2817000)) {
	        output = "error";
	    } else {
	        var z = Math.floor(inpJulianDayCnt + 0.5);
	        var f = (inpJulianDayCnt + 0.5) - z;
	        var A;
	        if (z < 2299161) {
	            A = z;
	        } else {
	            var alpha = Math.floor((z - 1867216.25) / 36524.25);
	            A = z + 1 + alpha - Math.floor(alpha / 4);
	        }
	        var B = A + 1524;
	        var C = Math.floor((B - 122.1) / JULIAN_NBRS.YEAR_DAYS);
	        var D = Math.floor(JULIAN_NBRS.YEAR_DAYS * C);
	        var E = Math.floor((B - D) / JULIAN_NBRS.DAYS_PER_MONTH_APPROX);
	        var day = B - D - Math.floor(JULIAN_NBRS.DAYS_PER_MONTH_APPROX * E) + f;
	        var month = (E < 14) ? E - 1 : E - 13;
	        var year = ((month > 2) ? C - JULIAN_NBRS.FIRST_YEAR_BCE : C - 4715);
	        if (inpFormatFlag == 2) output = zeroPad(day, 2) + " " + _monthList[month - 1].abbr;
	        if (inpFormatFlag == 3) output = zeroPad(day, 2) + _monthList[month - 1].abbr + year.toString();
	        if (inpFormatFlag == 4) output = zeroPad(day, 2) + _monthList[month - 1].abbr + year.toString() + ((next) ? " next" : " prev");
	    }
	    return output;
	}


	function timeDateString(inpJulianDayCnt, inpMinutesCnt) {
	    return formatTimeTxt(inpMinutesCnt, 2) + " " + dayString(inpJulianDayCnt, 0, 2);
	}


	/*
	 * Returns a zero-padded string (HH:MM:SS) given time in minutes.
	 *
	 * @param inpMinutesNbr - The minutes to convert.
	 * @param inpFormatFlag - 2 for HH:MM; 3 for HH:MM:SS
	 */
	function formatTimeTxt(inpMinutesNbr, inpFormatFlag) {
		var rtnTxt;

	    if ((inpMinutesNbr >= 0) && (inpMinutesNbr < 1440)) {
	        var floatHour = inpMinutesNbr / 60.0;
	        var hour = Math.floor(floatHour);
	        var floatMinute = 60.0 * (floatHour - Math.floor(floatHour));
	        var minute = Math.floor(floatMinute);
	        var floatSec = 60.0 * (floatMinute - Math.floor(floatMinute));
	        var second = Math.floor(floatSec + 0.5);
	        if (second > 59) {
	            second = 0;
	            minute += 1;
	        }
	        if ((inpFormatFlag == 2) && (second >= 30)) minute++;
	        if (minute > 59) {
	            minute = 0;
	            hour += 1;
	        }
	        rtnTxt = zeroPad(hour, 2) + ":" + zeroPad(minute, 2);
	        if (inpFormatFlag > 2) rtnTxt = rtnTxt + ":" + zeroPad(second, 2);
	    } else {
	        rtnTxt = "error";
	    }
	    return rtnTxt;
	}


} (window.SolarCalculator = window.SolarCalculator || {}) );