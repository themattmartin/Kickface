/*
 jQuery UI Sortable plugin wrapper
 https://raw.github.com/CyborgMaster/ui-sortable/angular1.2/src/sortable.js
 @param [ui-sortable] {object} Options to pass to $.fn.sortable() merged onto ui.config
 */
angular.module('metisMenu', [])
  .directive('metisMenu', [
    function() {
      return {
        restrict: 'A',
        link: function(scope, element, attrs, ngModel) {
           setTimeout(function(){
                $(element).metisMenu({toggle:true});
                $(element).find('li').not('.active').has('ul').children('ul').collapse('hide');
            },10);
        }
      };
    }
  ]);