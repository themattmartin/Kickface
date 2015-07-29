angular.module( 'omniboard.timeService', [] )

.factory('timeService', function($http, $rootScope) {
	return {
		toSiteLocalTime: function (location, time, callback) {
			//console.log('toSiteLocalTime: ', location, time, callback);
			var self = this;
			if (location && location.hasOwnProperty('latitude') && location.hasOwnProperty('longitude') && time && !isNaN(time)) {
				var url = '/fetchTimeByGPS?lat=' + location.latitude + '&lng=' + location.longitude;
				console.log(' url being called ', url);
				$http.jsonp(url, { withCredentials: false }).success(function (resp) {
					console.log('url returned ', resp);
					var isDST = self.localtime(time, true).tm_isdst;
					var dt = new Date(time);
					if (isDST && resp.dstOffset) {
						dt.setHours(dt.getHours() + resp.dstOffset);
					} else if (resp.gmtOffset) {
						dt.setHours(dt.getHours() + resp.gmtOffset);
					}

					$http({
						method: 'GET',
						url: '/convertTimezone?isoDateTime=' + dt.toISOString() + '&tzString=' + resp.timezoneId
					}).success(function (data, status, headers, config) {
						callback([dt.toISOString(), data]);
					}).error(function(err){
						callback(null);
					});
				}).error(function(err){
					callback(null);
				});
			}else{
				callback(null);
			}
		},
		fetchTime: function(location, callback){
			var self = this;
			if (location && location.hasOwnProperty("latitude") && location.hasOwnProperty("longitude")) {
				var url = "/fetchTimeByGPS?lat=" + location.latitude + "&lng=" + location.longitude;
				console.log(' url being called 2', url);
				$http.get(url, {withCredentials: false}).success(function(resp) {
					console.log('url returned ', resp);
					var d = Date.parse(resp.time);
					var currentTime;
					if (isNaN(d)) {
						d = resp.time.replace(/\D+/g,'');
						currentTime = new Date(d.substr(0,4),d.substr(4,2),d.substr(6,2),d.substr(8,2),d.substr(10,2));
					} else {
						currentTime = new Date(d);
					}
					resp.isDST = self.localtime(d, true).tm_isdst;
					//resp.rawOffset;
					//resp.gmtOffset
					//console.log('converting /convertTimezone?isoDateTime='+currentTime.toISOString()+'&tzString='+resp.timezoneId );
					$http({method: 'GET', url: '/convertTimezone?isoDateTime='+currentTime.toISOString()+'&tzString='+resp.timezoneId}).
					success(function(data, status, headers, config) {
						resp.dstZone = data;
						$rootScope.$broadcast('timeLoaded', resp);
						self.local = resp;
						callback(resp);
					});

					//resp.dstZone = self.getTZName(resp.isDST, resp.gmtOffset);

				}).
				error(function(data, status, headers, config) {
					// called asynchronously if an error occurs
					// or server returns response with an error status.
					console.log('we are in the error ', status, headers, data );
				});
			} else {
				callback(null);
			}
		},
		localtime : function(timestamp, is_assoc) {
			// http://kevin.vanzonneveld.net
			// +   original by: Brett Zamir (http://brett-zamir.me)
			// +  derived from: Josh Fraser (http://onlineaspect.com/2007/06/08/auto-detect-a-time-zone-with-javascript/)
			// +      parts by: Breaking Par Consulting Inc (http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256CFB006C45F7)
			// +   improved by: Ryan W Tenney (http://ryan.10e.us)
			// *     example 1: localtime();
			// *     returns 1: [50,28,0,14,2,109,6,73,0]
			var t, yday, x, o = {};

			if (timestamp === undefined) {
				t = new Date();
			} else if (timestamp instanceof Date) {
				t = timestamp;
			} else {
				t = new Date(timestamp * 1000);
			}

			x = function (t) {
				function stdTimezoneOffset(d) {
					var jan = new Date(d.getFullYear(), 0, 1);
					var jul = new Date(d.getFullYear(), 6, 1);
					return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
				}

				return t.getTimezoneOffset() < stdTimezoneOffset(t);
			};

			yday = Math.floor((t - new Date(t.getFullYear(), 0, 1)) / 86400000);

			o = {
				'tm_sec': t.getSeconds(),
				// seconds
				'tm_min': t.getMinutes(),
				// minutes
				'tm_hour': t.getHours(),
				// hour
				'tm_mday': t.getDate(),
				// day of the month, 1 - 31
				'tm_mon': t.getMonth(),
				// month of the year, 0 (January) to 11 (December)
				'tm_year': t.getFullYear() - 1900,
				// years since 1900
				'tm_wday': t.getDay(),
				// day of the week, 0 (Sun) to 6 (Sat)
				'tm_yday': yday,
				// day of the year
				'tm_isdst': x(t) // is daylight savings time in effect
			};

			return is_assoc ? o : [o.tm_sec, o.tm_min, o.tm_hour, o.tm_mday, o.tm_mon, o.tm_year, o.tm_wday, o.tm_yday, o.tm_isdst];
		},
		getTZName : function(dst,tzOffset){



			var standardTZs = {
				"-4":"AST",
				"-5":"EST",
				"-6":"CST",
				"-7":"MST",
				"-8":"PST",
				"-9":"AST",
				"-10":"HST"
			};
			var daylightTZs = {
				"-4":"ADT",
				"-5":"EDT",
				"-6":"CDT",
				"-7":"MDT",
				"-8":"PDT",
				"-9":"ADT",
				"-10":"HDT"
			};
			if( dst === true ){
				//console.log( standardTZs[tzOffset] );
				return standardTZs[tzOffset];
			} else {
				//console.log( daylightTZs[tzOffset] );
				return daylightTZs[tzOffset];
			}
		}
	};
})

;