var app = angular.module("myApp", []);
// alert(app);
app.controller(
  "invcountlistController",
  function ($scope, $http, $window, $filter, $timeout) {
    c = console.log.bind(document);
    $scope.urlObj = document.getElementById("myDataObj").innerHTML;
    $scope.urlObj = JSON.parse($scope.urlObj);
    var ajaxUrl = $scope.urlObj["ajaxUrl"];
    ($scope.loading = false),
      ($scope.goBack = function () {
        $window.history.back();
      });

    $scope.getSetUpData = function () {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            "&ref=getSetUpData" +
            "&setUpId=" +
            $scope.urlObj["setUpId"] +
            "&locationId=" +
            $scope.urlObj["locationId"]
        )
        .then(
          function (response) {
            $scope.setUpData = response["data"]["setUpData"];
            $scope.locObj = response["data"]["locationObj"];
            $scope.invenoryCountList = response["data"]["invenoryCountList"];
            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert("error::::::");
          }
        );
    };
    $scope.getSetUpData();

    $scope.pickInventory = function () {
      console.log("Selected Result:", $scope.selectedResult);
      if ($scope.selectedResult) {
        $window.location.href =
          $scope.urlObj["invConfigUrl"] +
          "&empId=" +
          $scope.urlObj["empId"] +
          "&setUpId=" +
          $scope.urlObj["setUpId"] +
          "&locationId=" +
          $scope.urlObj["locationId"] +
          "&tranId=" +
          $scope.selectedResult.id;
      } else {
        alert("Please select atleast one!!");
      }
    };
	$scope.cardclick = function (invObj) {
		$scope.selectedResult = invObj;
	}
  }
);
