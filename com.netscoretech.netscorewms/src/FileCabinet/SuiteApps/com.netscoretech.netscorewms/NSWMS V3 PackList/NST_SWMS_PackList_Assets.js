var app = angular.module('myApp', []);
app.controller('PackListController', function ($scope, $window, $http, $filter) {
  $scope.urlObj = document.getElementById('myDataObj').innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj['ajaxUrl'];
  $scope.loading = false;
  document.getElementById('transactionlist').focus();
  $scope.goBack = function () {
    $window.history.back();
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
          $scope.finaldata = [];
          $scope.locObj = response['data']['locationObj'];
          $scope.pickedIFs = response.data.pickedStatusIFs;
          $scope.pickedIFs.forEach(function (order) {
            if (order.createdFrom) {
              var parts = order.createdFrom.split('Sales Order #');
              if (parts.length > 1) {
                order.createdFrom = parts[1].trim();
              } else {
                parts = order.createdFrom.split('Transfer Order #');
                if (parts.length > 1) {
                  order.createdFrom = parts[1].trim();
                }
              }
            }
          });
          $scope.listObj = $scope.pickedIFs;
          $scope.parsedDates = [];

          // for (var i = 0; i < response.data.pickedStatusIFs.length; i++) {
          //   var dateSplit =
          //     response.data.pickedStatusIFs[i].tranDateString.split("/");
          //   var formattedDate =
          //     dateSplit[1] + "/" + dateSplit[0] + "/" + dateSplit[2];
          //   var parsedDate = new Date(formattedDate);

          //   $scope.parsedDates.push(parsedDate);

          //   console.log(
          //     "inside",
          //     response.data.pickedStatusIFs[i].orderNo + " " + parsedDate
          //   );
          // }
          $scope.loading = false;
        },
        function (response) {
          $scope.loading = false;
          alert('error::::::');
        },
      );
  };

  $scope.scanOrder = function (scannedOrder) {
    $scope.listObj = $filter('filter')($scope.pickedIFs, {
      createdFrom: scannedOrder,
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

  $scope.selectTransaction = function () {
    $scope.listObj = $filter('filter')($scope.pickedIFs, {
      recordType: $scope.transactionlist,
    });
    $scope.fromDate = '';
    $scope.toDate = '';

    document.getElementById('scanitem').focus();
  };

  $scope.selectedResult;

  $scope.packItems = function () {
    if ($scope.selectedResult) {
      var url = $scope.urlObj['packshipOrd'];
      url +=
        '&empId=' +
        $scope.urlObj['empId'] +
        '&setUpId=' +
        $scope.urlObj['setUpId'] +
        '&locationId=' +
        $scope.urlObj['locationId'] +
        '&tranId=' +
        $scope.selectedResult.orderNo;
      $window.location.href = url;
    } else {
      alert('Please select at least one order!!');
    }
  };

  $scope.searchbydate = function () {
    if (!$scope.fromDate && !$scope.toDate) {
      alert("Please enter a 'From' and 'To' date to perform the search.");
      return;
    }
    if (!$scope.fromDate || !$scope.toDate) {
      return $scope.fromDate ? alert('Please Enter To Date') : alert('Please Enter From Date');
    }
    if ($scope.fromDate > $scope.toDate) {
      $scope.fromDate = '';
      $scope.toDate = '';
      $scope.transactionlist = '';
      $scope.selectTransaction();
      return alert('From Date Should Be Less Than To Date');
    }
    $scope.listObj = $scope.pickedIFs.filter(function (item) {
      var itemDate = new Date(item.tranDate.split('/').reverse().join('-'));
      itemDate.setHours(0);
      itemDate.setMinutes(0);
      itemDate.setSeconds(0);
      itemDate.setMilliseconds(0);

      if ($scope.fromDate && $scope.toDate) {
        return itemDate >= $scope.fromDate && itemDate <= $scope.toDate;
      } else if ($scope.fromDate) {
        return itemDate >= $scope.fromDate;
      } else if ($scope.toDate) {
        return itemDate <= $scope.toDate;
      } else {
        return true;
      }
    });
  };

  $scope.cardclick = function (orders) {
    $scope.selectedResult = orders;
  };

  $scope.openScanner = function () {
    $window.parent.postMessage({ func: 'pickscanBarcodeforV3', message: 'scanning' }, '*');
    $window.addEventListener('message', myClick);
  };

  function myClick(event) {
    if (event.data[1] == 'imageCapture') {
      $scope.uploadImagetoNS(event.data[0]);
    } else if (event.data[1] == 'scanning') {
      $scope.$apply(function () {
        $scope.scannedOrder = event.data[0];
        $scope.scanOrder($scope.scannedOrder);
      });
    }
  }

  $scope.logOut = function () {
    const confirmation = confirm('Are you sure you want to logout?');
    if (confirmation) {
      $window.location.href = $scope.urlObj['logIn'];
    }
  };

  $scope.getSetUpData();
});
