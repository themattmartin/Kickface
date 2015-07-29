/**
 * Core Helpers Module for Omniboard
 */
angular.module("omniboard.core.util", [])
    .factory('util', [function () {
        return {
            // Generates key from object properties, e.g.: 'Model:Device.ExpressionType:values|alarm.ExpressionCategory:HVAC.Name:High Temperature Alarm.ItemId:-JUt_6AaPrF7tPI57Hls'
            getKey: function (o) {
                if (!Object.keys(o).length) {
                    return '';
                }

                var values = [];
                for (var key in o) {
                    values.push(key + ':' + o[key]);
                }

                return values.join('.');
            },

            // Builds query string from object properties
            buildQueryParams: function (o) {
                if (!Object.keys(o).length) {
                    return '';
                }

                var values = [];
                for (var key in o) {
                    values.push(key + '=' + o[key]);
                }

                return '?' + values.join('&');
            },

            // Gets objects value by full path, e.g.: obj.params.val
            getValueDeep: function (o, path) {
                var paths = path.split('.'), current = o, i;

                for (i = 0; i < paths.length; ++i) {
                    if (current[paths[i]] === undefined) {
                        return undefined;
                    } else {
                        current = current[paths[i]];
                    }
                }

                return current;
            },

            // Checks if object has property by full path, e.g.: obj.params.val
            hasOwnPropertyDeep: function (o, path) {
                var paths = path.split('.'), current = o, i;

                for (i = 0; i < paths.length; ++i) {
                    if (!current.hasOwnProperty(paths[i])) {
                        return false;
                    } else {
                        current = current[paths[i]];
                    }
                }

                return true;
            }
        };
    }])
;
