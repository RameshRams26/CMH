angular.module('myApp', []).controller('StoreOrCustomerPickUpDashboard', function ($scope , $window , $http , $interval) {
    $scope.urlObj = document.getElementById('myDataObj').innerHTML;
  $scope.urlObj = JSON.parse($scope.urlObj);
  var ajaxUrl = $scope.urlObj['ajaxUrl'];
  $scope.userRole = 'delivery operator'; // change to 'delivery' for delivery operator
  $scope.filters = {};
  $scope.selectedOrder = null;
  $scope.loading = false;

    $scope.goBack = function (type) {
      $window.history.back();
  };

  function updateCounts() {
    $scope.totalOrders = $scope.orders.length;
    $scope.startedCount = $scope.orders.filter((o) => o.status === 'Pending').length;
    $scope.inProgressCount = $scope.orders.filter((o) => o.status === 'In Progress').length;
    $scope.completedCount = $scope.orders.filter((o) => o.status === 'Completed').length;
  }
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
           $scope.loading = false;
        },
        function (response) {
          $scope.loading = false;
          alert('error::::::');
        },
      );
  };
  $scope.getSetUpData();

  $scope.getOrderDetails = function () {
        $http
      .get(
        ajaxUrl +
          '&ref=getOrderDetails' + 
          '&setUpId=' +
          $scope.urlObj['setUpId'] +
          '&locationId=' +
          $scope.urlObj['locationId'],
      )
      .then(
        function (response) {
          console.log(response);
          $scope.orders = response["data"]["pickedStatusIFs"];
            updateCounts();
        },
        function (error) {
          $scope.loading = false;
          alert(error.message);
        },
      );
  }

  //   $interval(function () {
  //   console.log("Interval running...");
  //   $scope.getOrderDetails();
  // }, 10000);


  $scope.applyFilters = function (order) {
    if ($scope.filters.date && order.date !== $scope.filters.date.toISOString().split('T')[0]) return false;
    if ($scope.filters.client && !order.client.toLowerCase().includes($scope.filters.client.toLowerCase()))
      return false;
    if ($scope.filters.soNumber && !order.soNumber.toLowerCase().includes($scope.filters.soNumber.toLowerCase()))
      return false;
    return true;
  };

  // Role-based filter: show only completed orders if driver
  $scope.roleFilter = function (order) {
    if ($scope.userRole === 'driver') return order.status === 'Completed';
    return true;
  };


  $scope.getCount = function(status){ return $scope.orders.filter(o=>o.status===status).length; }
  $scope.toggleExpand = function(order){ order.expanded = !order.expanded; }

  $scope.deliver = function (order) {
    alert('Delivered: ' + order.salesOrder);
     if (order.salesOrder) {
      var url = $scope.urlObj['packshipOrd'];
      url +=
        '&empId=' +
        $scope.urlObj['empId'] +
        '&setUpId=' +
        $scope.urlObj['setUpId'] +
        '&locationId=' +
        $scope.urlObj['locationId'] +
        '&tranId=' +
        order.salesOrderId +
        '&assignmentId=' +
        order.assignmentLink;
      $window.location.href = url;
    }
  };
});
