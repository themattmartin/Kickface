/**
 * Tests sit right alongside the file they are testing, which is more intuitive
 * and portable than separating `src` and `test` directories. Additionally, the
 * build process will exclude all `.spec.js` files from the build
 * automatically.
 */
describe( 'login section', function() {

	it( 'should have a dummy test', inject( function() {
		expect( true ).toBeTruthy();
	}));

/*
	beforeEach( module( 'omniboard' ) );

	var $controller,$http,$rootScope,httpBackend,FirebaseRootRef,initialFirebaseChild,es;
	var fakeToken = 'eyJleHAiOjQxMDI0NjY0MDAwMDAsInYiOjAsImQiOnsia2V5IjoiLUpaVXR1enMzSVBzc1hlTk5MUmciLCJ1aWQiOiJzaW1wbGVsb2dpbjo0MyIsImFwcCI6Im9tYiIsImlzTG9nZ2VkSW4iOnRydWV9LCJpYXQiOjE0MjQ3ODc0MjB9';

	beforeEach(inject(function($httpBackend, _$controller_, _$rootScope_, _FirebaseRootRef_){
		httpBackend = $httpBackend;
		$controller = _$controller_;
		$rootScope = _$rootScope_;
		FirebaseRootRef = _FirebaseRootRef_;
	}));

	describe('$scope.login', function() {
		it('login username and password authentication', function() {
			httpBackend.expectPOST('/doAuth').respond(200, {
				data: {},
				key: "-JZUtuzs3IPssXeNNLRg",
				token: fakeToken,
			});

			FirebaseRootRef.authWithCustomToken = function(token) {
				expect(token).toEqual(fakeToken);
			};

			var $scope = {};
			var controller = $controller('LoginCtrl', { $scope: $scope, $rootScope: $rootScope, FirebaseRootRef: FirebaseRootRef});
			$scope.username = 'mattmartin@ccbac.com';
			$scope.password = 'password';
			$scope.login();

			httpBackend.flush();
		});
	});
*/
});
