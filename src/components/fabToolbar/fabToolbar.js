(function() {
  'use strict';

  angular
    // Declare our module
    .module('material.components.fabToolbar', [
      'material.core',
      'material.components.fabTrigger',
      'material.components.fabActions'
    ])

    // Register our directive
    .directive('mdFabToolbar', MdFabToolbarDirective)

    // Register our custom animations
    .animation('.md-fab-toolbar', MdFabToolbarAnimation)

    // Register a service for the animation so that we can easily inject it into unit tests
    .service('mdFabToolbarAnimation', MdFabToolbarAnimation);

  /**
   * @ngdoc directive
   * @name mdFabToolbar
   * @module material.components.fabToolbar
   *
   * @restrict E
   *
   * @description
   *
   * The `<md-fab-toolbar>` directive is used present a toolbar of elements (usually `<md-button>`s)
   * for quick access to common actions when a floating action button is activated (via hover or
   * keyboard navigation).
   *
   * @usage
   *
   * <hljs lang="html">
   * <md-fab-toolbar>
   *   <md-fab-trigger>
   *     <md-button aria-label="Add..."><md-icon icon="/img/icons/plus.svg"></md-icon></md-button>
   *   </md-fab-trigger>
   *
   *   <md-fab-actions>
   *     <md-button aria-label="Add User">
   *       <md-icon icon="/img/icons/user.svg"></md-icon>
   *     </md-button>
   *
   *     <md-button aria-label="Add Group">
   *       <md-icon icon="/img/icons/group.svg"></md-icon>
   *     </md-button>
   *   </md-fab-actions>
   * </md-fab-toolbar>
   * </hljs>
   *
   * @param {expression=} md-open Programmatically control whether or not the toolbar is visible.
   */
  function MdFabToolbarDirective() {
    return {
      restrict: 'E',
      transclude: true,
      template: '<div class="md-fab-toolbar-wrapper">' +
      '  <div class="md-fab-toolbar-content" ng-transclude></div>' +
      '</div>',

      scope: {
        isOpen: '=?mdOpen'
      },

      bindToController: true,
      controller: FabToolbarController,
      controllerAs: 'vm',

      link: link
    };

    function FabToolbarController($scope, $element, $animate, $mdUtil, $timeout) {
      var vm = this;

      // Create a flag to track if we recently gained focus. This is necessary because when the
      // trigger is clicked, it fires both the focus and click events which was immediately closing
      // the speed dial.
      var recentlyFocused = false;

      // NOTE: We use async evals below to avoid conflicts with any existing digest loops

      vm.open = function() {
        $scope.$evalAsync("vm.isOpen = true");
      };

      vm.close = function() {
        // Async eval to avoid conflicts with existing digest loops
        $scope.$evalAsync("vm.isOpen = false");
      };

      // Toggle the open/close state when the trigger is clicked
      vm.toggle = function() {
        // Don't allow closing if we were very recently focused
        if (!recentlyFocused) {
          $scope.$evalAsync("vm.isOpen = !vm.isOpen");
        }
      };

      // Always open when any speed dial child fires focusin (via mouse or keyboard).
      vm.focusin = function() {
        recentlyFocused = true;

        // After a short delay, reset our recentlyFocused flag
        $timeout(function() {
          recentlyFocused = false;
        }, 500);

        // Open
        vm.open();
      };

      // Always close if any child fires focusout (if something else immediately fires focusin, it
      // will immediately reopen the component)
      vm.focusout = function() {
        vm.close();
      };

      setupDefaults();
      setupListeners();
      setupWatchers();
      fireInitialAnimations();

      function setupDefaults() {
        // Set the default to be closed
        vm.isOpen = vm.isOpen || false;
      }

      function setupListeners() {
        $element.on('focusin', vm.focusin);
        $element.on('focusout', vm.focusout);

        // Make sure to destroy any listeners
        $scope.$on('$destroy', destroyListeners);
      }

      function destroyListeners() {
        $element.off('focusin', vm.focusin);
        $element.off('focusout', vm.focusout);
      }

      function setupWatchers() {
        // Watch for changes to md-open and toggle our class
        $scope.$watch('vm.isOpen', function(isOpen) {
          var toAdd = isOpen ? 'md-is-open' : '';
          var toRemove = isOpen ? '' : 'md-is-open';

          $animate.setClass($element, toAdd, toRemove);
        });
      }

      // Fire the animations once in a separate digest loop to initialize them
      function fireInitialAnimations() {
        $mdUtil.nextTick(function() {
          $animate.addClass($element, 'md-fab-toolbar');
        });
      }
    }

    function link(scope, element, attributes) {
      // Don't allow focus on the trigger
      element.find('md-fab-trigger').find('button').attr('tabindex', '-1');

      // Prepend the background element to the trigger's button
      element.find('md-fab-trigger').find('button')
        .prepend('<div class="md-fab-toolbar-background"></div>');
    }
  }

  function MdFabToolbarAnimation() {
    var originalIconDelay;

    function runAnimation(element, className, done) {
      var el = element[0];
      var ctrl = element.controller('mdFabToolbar');

      // Grab the relevant child elements
      var backgroundElement = el.querySelector('.md-fab-toolbar-background');
      var triggerElement = el.querySelector('md-fab-trigger button');
      var toolbarElement = el.querySelector('md-toolbar');
      var iconElement = el.querySelector('md-fab-trigger button md-icon');
      var actions = element.find('md-fab-actions').children();

      // If we have both elements, use them to position the new background
      if (triggerElement && backgroundElement) {
        // Get our variables
        var color = window.getComputedStyle(triggerElement).getPropertyValue('background-color');
        var width = el.offsetWidth;
        var height = el.offsetHeight;

        // Make a square
        var scale = width * 2;

        // Set some basic styles no matter what animation we're doing
        backgroundElement.style.backgroundColor = color;
        backgroundElement.style.borderRadius = width + 'px';

        // If we're open
        if (ctrl.isOpen) {

          // Set the width/height to take up the full toolbar width
          backgroundElement.style.width = scale + 'px';
          backgroundElement.style.height = scale + 'px';

          // Set the top/left to move up/left (or right) by the scale width/height
          backgroundElement.style.top = -(scale / 2) + 'px';

          if (element.hasClass('md-left')) {
            backgroundElement.style.left = -(scale / 2) + 'px';
            backgroundElement.style.right = null;
          }

          if (element.hasClass('md-right')) {
            backgroundElement.style.right = -(scale / 2) + 'px';
            backgroundElement.style.left = null;
          }

          // Set the next close animation to have the proper delays
          backgroundElement.style.transitionDelay = '0ms';
          iconElement && (iconElement.style.transitionDelay = '.3s');

          // Apply a transition delay to actions
          angular.forEach(actions, function(action, index) {
            action.style.transitionDelay = (actions.length - index) * 25 + 'ms';
          });
        } else {
          // Otherwise, set the width/height to the trigger's width/height
          backgroundElement.style.width = triggerElement.offsetWidth + 'px';
          backgroundElement.style.height = triggerElement.offsetHeight + 'px';

          // Reset the position
          backgroundElement.style.top = '0px';

          if (element.hasClass('md-left')) {
            backgroundElement.style.left = '0px';
            backgroundElement.style.right = null;
          }

          if (element.hasClass('md-right')) {
            backgroundElement.style.right = '0px';
            backgroundElement.style.left = null;
          }

          // Set the next open animation to have the proper delays
          backgroundElement.style.transitionDelay = '200ms';
          iconElement && (iconElement.style.transitionDelay = '0ms');

          // Apply a transition delay to actions
          angular.forEach(actions, function(action, index) {
            action.style.transitionDelay = (index * 25) + 'ms';
          });
        }
      }
    }

    return {
      addClass: function(element, className, done) {
        runAnimation(element, className, done);
        done();
      },

      removeClass: function(element, className, done) {
        runAnimation(element, className, done);
        done();
      }
    }
  }
})();