var app = angular.module('myApp', []);
app.controller('PickListController', function ($scope, $window, $http, $filter, $timeout) {
  $scope.urlObj = document.getElementById('myDataObj').innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj['ajaxUrl'];
  console.log(JSON.stringify($scope.urlObj));
  $scope.loading = false;
  $scope.goBack = function () {
    $window.history.back();
  };
  $scope.logOut = function () {
    const confirmation = confirm('Are you sure you want to logout?');
    if (confirmation) {
      $window.location.href = $scope.urlObj['logIn'];
    }
  };
  $scope.getSetUpData = function () {
    $scope.loading = true;
    $http
      .get(
        ajaxUrl +
          '&ref=getSetUpData' +
          '&setUpId=' +
          $scope.urlObj['setUpId'] +
          '&locationId=' +
          $scope.urlObj['locationId'],
      )
      .then(
        function (response) {
          $scope.setUpData = response['data']['setUpData'];
          $scope.locObj = response['data']['locationObj'];
          $scope.getOrderDetails();
        },
        function (response) {
          $scope.loading = false;
          alert('error::::::');
        },
      );
  };
  $scope.getSetUpData();
  $scope.getOrderDetails = function () {
    $scope.loading = true;
    $http
      .get(
        ajaxUrl +
          '&ref=getOrders' +
          '&empId=' +
          $scope.urlObj['empId'] +
          '&locationId=' +
          $scope.urlObj['locationId'] +
          '&assigned=' +
          $scope.setUpData['assigned'],
      )
      .then(function (response) {
        if (response.data.status == 'error') {
          $scope.loading = false;
          return alert(response.data.message);
        } else {
          var data = response['data'];
          console.log('Data::' + JSON.stringify(data));

          $scope.allOrders = response.data.OrdersListSoTo.ordersList;
          $scope.listObj = $scope.allOrders;
          console.log('$scope.listObj', $scope.listObj);
          $scope.loading = false;
        }
      });
  };
  $scope.selectTransaction = function () {
    $scope.listObj = $filter('filter')($scope.allOrders, {
      Type: $scope.transactionlist,
    });
    $scope.fromDate = '';
    $scope.toDate = '';
  };
  $scope.searchbydate = function () {
    if ($scope.fromDate) {
      $scope.listObj = $scope.allOrders.filter(function (item) {
        var itemDate = new Date(item.dates.split('/').reverse().join('-'));
        itemDate.setHours(0);
        itemDate.setMinutes(0);
        itemDate.setSeconds(0);
        itemDate.setMilliseconds(0);
        return itemDate >= $scope.fromDate;
      });
      if (!$scope.listObj.length) {
        alert('No Orders Found!!');
        $scope.fromDate = '';
        $scope.toDate = '';
        $scope.transactionlist = '';
        $scope.selectTransaction();
      }
    }

    if ($scope.toDate) {
      $scope.listObj = $scope.listObj.filter(function (item) {
        var itemDate = new Date(item.dates.split('/').reverse().join('-'));
        itemDate.setHours(0);
        itemDate.setMinutes(0);
        itemDate.setSeconds(0);
        itemDate.setMilliseconds(0);
        return itemDate <= $scope.toDate;
      });
    }
  };

  $scope.scanOrder = function (scannedOrder) {
    $scope.listObj = $filter('filter')($scope.allOrders, {
      docNumber: scannedOrder,
    });
    if (!$scope.listObj.length) {
      alert('Order is not found');
      $scope.scannedOrder = '';
      $scope.fromDate = '';
      $scope.toDate = '';
      $scope.transactionlist = '';
      $scope.selectTransaction();
    }
  };
  console.log('$scope.urlObj["empId"]' + $scope.urlObj['empId']);
  console.log('$scope.urlObj["setUpId"] ' + $scope.urlObj['setUpId']);
  console.log('$scope.urlObj["locationId"] ' + $scope.urlObj['locationId']);

  $scope.pickOrder = function () {
    console.log('Selected Result:', $scope.selectedResult);
    if ($scope.selectedResult) {
      var url = '';
      if ($scope.selectedResult.Type == 'Sales Order') {
        url = $scope.urlObj['shipOrd'];
      } else if ($scope.selectedResult.Type == 'Transfer Order') {
        url = $scope.urlObj['shipTo'];
      }
      $window.location.href =
        url +
        '&empId=' +
        $scope.urlObj['empId'] +
        '&setUpId=' +
        $scope.urlObj['setUpId'] +
        '&locationId=' +
        $scope.urlObj['locationId'] +
        '&tranId=' +
        $scope.selectedResult.docNumber;
    } else {
      alert('Please select atleast one order!!');
    }
  };
  $scope.onClick = function (orders) {
    $scope.selectedResult = orders;
  };
  // console.log('$scope.selectedResult.docNumber '+ $scope.selectedResult.docNumber);

  $scope.moveFocusToNextField = function (fieldId) {
    $timeout(function () {
      document.getElementById(fieldId).focus();
    });
  };
  $scope.moveFocusToNextField('transactionlist');
});
