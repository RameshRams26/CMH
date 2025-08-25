var app = angular.module("myApp", []);
app.controller(
  "ChangePinController",
  function ($scope, $window, $timeout, $http) {
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    console.log("$scope.urlObj ", JSON.stringify($scope.urlObj));
    $scope.loading = false;
    $scope.showOldPassword = false;
    $scope.showNewPassword = false;
    $scope.showConfirmPassword = false;
    $scope.toggleOldPassword = function () {
      $scope.showOldPassword = !$scope.showOldPassword;
    };
    $scope.toggleNewPassword = function () {
      $scope.showNewPassword = !$scope.showNewPassword;
    };
    $scope.toggleConfirmPassword = function () {
      $scope.showConfirmPassword = !$scope.showConfirmPassword;
    };
    $scope.changePassword = function () {
		 if (!$scope.oldPassword || !$scope.newPassword || !$scope.confirmPassword) {
			alert("Please fill in all the fields.");
			return; 
		  }
      if ($scope.newPassword !== $scope.confirmPassword) {
        $scope.passwordsMismatch = true;
        alert("PIN did not match.");
        $scope.newPassword = "";
        $scope.confirmPassword = "";
        $timeout(function () {
          angular.element(document.querySelector("#newPassword")).focus();
        });
      } else if ($scope.newPassword.length !== 4) {
        $scope.passwordsMismatch = true;
        alert("PIN length must be 4 digits.");
        $scope.newPassword = "";
        $scope.confirmPassword = "";
        $timeout(function () {
          angular.element(document.querySelector("#newPassword")).focus();
        });
      } else {
        console.log("Old Password:" + $scope.oldPassword);
        console.log("New Password:" + $scope.newPassword);
        console.log("Confirm Password:" + $scope.confirmPassword);
        $scope.loading = true;
        $http
          .post(
            ajaxUrl + "&ref=1000",
            JSON.stringify({
              newpwd: $scope.newPassword,
              empId: $scope.urlObj["empId"],
              oldpwd: $scope.oldPassword,
            })
          )
          .then(
            function (response) {
              var data = response["data"];
              if (data["status"] == "failure") {
                alert("Old password wrong!!");
              } else {
                alert("Successfull!!");
                $window.location.href = $scope.urlObj["logUrl"];
              }
              $scope.loading = false;
            },
            function (response) {
              $scope.loading = false;
              alert("error::::::");
            }
          );
      }
    };
    $scope.goBack = function () {
      $window.history.back();
    };
  }
);