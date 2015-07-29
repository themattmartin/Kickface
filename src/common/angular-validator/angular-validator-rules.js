(function() {
  angular.module('validator.rules', ['validator']).config([
    '$validatorProvider', function($validatorProvider) {
      $validatorProvider.register('required', {
        invoke: 'watch',
        validator: /.+/,
        error: 'This field is required.'
      });
      $validatorProvider.register('name', {
        invoke: 'watch',
        validator: /^[a-zA-Z][a-zA-Z0-9_]*$/,
        error: 'This field should begin with an alphabet and cannot contain any special character or white space.'
      });
      $validatorProvider.register('alphanumeric', {
        invoke: 'watch',
        validator: /^[a-zA-Z0-9_ ]*$/,
        error: 'This field should not contain special characters.'
      });
      $validatorProvider.register('number', {
        invoke: 'watch',
        validator: /^[-+]?[0-9]*[\.]?[0-9]*$/,
        error: 'This field should be the number.'
      });
      $validatorProvider.register('email', {
        invoke: 'blur',
        validator: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        error: 'This field should be the email.'
      });
      return $validatorProvider.register('url', {
        invoke: 'blur',
        validator: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/,
        error: 'This field should be the url.'
      });
    }
  ]);

}).call(this);
