angular.module('omniboard.mapStyles.crud', [])

.factory('MapStyleRef', ['FirebaseRootRef', 'initialFirebaseChild', function (FirebaseRootRef, initialFirebaseChild) {
	return{
		get: function(){
			return FirebaseRootRef.child(initialFirebaseChild.get()).child('mapStyles');
		}
	};
}])


.factory('MapStyles', ['$firebase','MapStyleRef', 'firebaseManager',  function ($firebase, MapStyleRef, firebaseManager) {
  return {
      mapProviderStyle: {
        'Midnight Commander': {
          name: "Midnight Commander",
          image: "/assets/MidnightCommander.jpg",
          style:
          [
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#193341"
            }
            ]
          },
          {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#2c5a71"
            }
            ]
          },
          {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#29768a"
            },
            {
              "lightness": -37
            }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#406d80"
            }
            ]
          },
          {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#406d80"
            }
            ]
          },
          {
            "elementType": "labels.text.stroke",
            "stylers": [
            {
              "visibility": "on"
            },
            {
              "color": "#3e606f"
            },
            {
              "weight": 2
            },
            {
              "gamma": 0.84
            }
            ]
          },
          {
            "elementType": "labels.text.fill",
            "stylers": [
            {
              "color": "#ffffff"
            }
            ]
          },
          {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [
            {
              "weight": 0.6
            },
            {
              "color": "#1a3541"
            }
            ]
          },
          {
            "elementType": "labels.icon",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#2c5a71"
            }
            ]
          }
          ]
        },
        'Pale Dawn': {
          name: "Pale Dawn",
          image:"/assets/PaleDawn.jpg",
          style: [
          {
            "featureType": "water",
            "stylers": [
            {
              "visibility": "on"
            },
            {
              "color": "#acbcc9"
            }
            ]
          },
          {
            "featureType": "landscape",
            "stylers": [
            {
              "color": "#f2e5d4"
            }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#c5c6c6"
            }
            ]
          },
          {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#e4d7c6"
            }
            ]
          },
          {
            "featureType": "road.local",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#fbfaf7"
            }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [
            {
              "color": "#c5dac6"
            }
            ]
          },
          {
            "featureType": "administrative",
            "stylers": [
            {
              "visibility": "on"
            },
            {
              "lightness": 33
            }
            ]
          },
          {
            "featureType": "poi.park",
            "elementType": "labels",
            "stylers": [
            {
              "visibility": "on"
            },
            {
              "lightness": 20
            }
            ]
          },
          {},
          {
            "featureType": "road",
            "stylers": [
            {
              "lightness": 20
            }
            ]
          }
          ]
        },
        'Gowalla': {
          name:"Gowalla",
          image:"/assets/Gowalla.jpg",
          style: 
          [
          {
            "featureType": "road",
            "elementType": "labels",
            "stylers": [
            {
              "visibility": "simplified"
            },
            {
              "lightness": 20
            }
            ]
          },
          {
            "featureType": "administrative.land_parcel",
            "elementType": "all",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "landscape.man_made",
            "elementType": "all",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "road.local",
            "elementType": "labels",
            "stylers": [
            {
              "visibility": "simplified"
            }
            ]
          },
          {
            "featureType": "road.local",
            "elementType": "geometry",
            "stylers": [
            {
              "visibility": "simplified"
            }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "labels",
            "stylers": [
            {
              "visibility": "simplified"
            }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "labels",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "road.arterial",
            "elementType": "labels",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "water",
            "elementType": "all",
            "stylers": [
            {
              "hue": "#a1cdfc"
            },
            {
              "saturation": 30
            },
            {
              "lightness": 49
            }
            ]
          },
          {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
            {
              "hue": "#f49935"
            }
            ]
          },
          {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [
            {
              "hue": "#fad959"
            }
            ]
          }
          ]
        },
        'Chilled': {
          name:"Chilled",
          image:"/assets/Chilled.jpg",
          style: 
          [
          {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [
            {
              "visibility": "simplified"
            }
            ]
          },
          {
            "featureType": "road.arterial",
            "stylers": [
            {
              "hue": 149
            },
            {
              "saturation": -78
            },
            {
              "lightness": 0
            }
            ]
          },
          {
            "featureType": "road.highway",
            "stylers": [
            {
              "hue": -31
            },
            {
              "saturation": -40
            },
            {
              "lightness": 2.8
            }
            ]
          },
          {
            "featureType": "poi",
            "elementType": "label",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "landscape",
            "stylers": [
            {
              "hue": 163
            },
            {
              "saturation": -26
            },
            {
              "lightness": -1.1
            }
            ]
          },
          {
            "featureType": "transit",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "water",
            "stylers": [
            {
              "hue": 3
            },
            {
              "saturation": -24.24
            },
            {
              "lightness": -38.57
            }
            ]
          }
          ]
        },
        'Subtle Grayscale': {
          name:"Subtle Grayscale",
          image:"/assets/SubtleGrayscale.jpg",
          style: 
          [
          {
            "featureType": "landscape",
            "stylers": [
            {
              "saturation": -100
            },
            {
              "lightness": 65
            },
            {
              "visibility": "on"
            }
            ]
          },
          {
            "featureType": "poi",
            "stylers": [
            {
              "saturation": -100
            },
            {
              "lightness": 51
            },
            {
              "visibility": "simplified"
            }
            ]
          },
          {
            "featureType": "road.highway",
            "stylers": [
            {
              "saturation": -100
            },
            {
              "visibility": "simplified"
            }
            ]
          },
          {
            "featureType": "road.arterial",
            "stylers": [
            {
              "saturation": -100
            },
            {
              "lightness": 30
            },
            {
              "visibility": "on"
            }
            ]
          },
          {
            "featureType": "road.local",
            "stylers": [
            {
              "saturation": -100
            },
            {
              "lightness": 40
            },
            {
              "visibility": "on"
            }
            ]
          },
          {
            "featureType": "transit",
            "stylers": [
            {
              "saturation": -100
            },
            {
              "visibility": "simplified"
            }
            ]
          },
          {
            "featureType": "administrative.province",
            "stylers": [
            {
              "visibility": "off"
            }
            ]
          },
          {
            "featureType": "water",
            "elementType": "labels",
            "stylers": [
            {
              "visibility": "on"
            },
            {
              "lightness": -25
            },
            {
              "saturation": -100
            }
            ]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
            {
              "hue": "#ffff00"
            },
            {
              "lightness": -25
            },
            {
              "saturation": -97
            }
            ]
          }
          ]
        },
      },
      list: function () {return firebaseManager.buildRef(MapStyleRef.get().child('models'));},
      names: function () {return firebaseManager.buildRef(MapStyleRef.get().child('modelNames'));},
      getMapName: function(){return Object.getOwnPropertyNames(this.mapProviderStyle); },
      getStyle: function(styleName) {
        if(!styleName){
          styleName='Gowalla';
        }
        return this.mapProviderStyle[styleName].style;},
      getMap: function(styleName) {return this.map;},
      getStyleNames: function(){
        return this.mapProviderStyle;
      }
     
  };
}]);
