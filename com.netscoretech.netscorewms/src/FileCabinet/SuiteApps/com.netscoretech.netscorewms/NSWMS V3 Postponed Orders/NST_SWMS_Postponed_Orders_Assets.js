angular.module('postponedApp', []).controller('PostponedCtrl', [
  '$scope',
  '$window',
  function ($scope, $window) {
    // Sample postponed orders
    $scope.goBack = function () {
      $window.history.back();
    };
    $scope.postponedOrders = [
      {
        so: 'SO123',
        if: 'IF456',
        client: 'ABC Retailers',
        type: 'Postponed',
        source: 'Pickup Operator',
        attemptDate: '2025-08-20',
        status: 'Pending',
      },
      {
        so: 'SO126',
        if: 'IF459',
        client: 'XYZ Distributors',
        type: 'Postponed',
        source: 'Driver',
        attemptDate: '2025-08-21',
        status: 'Pending',
      },
      {
        so: 'SO140',
        if: 'IF470',
        client: 'Metro Wholesale',
        type: 'Postponed',
        source: 'Pickup Operator',
        attemptDate: '2025-08-23',
        status: 'Pending',
      },
    ];

    // Filtering logic (only Pending orders + search criteria)
    $scope.filterOrders = function (order) {
      if (order.status !== 'Pending') return false; // show only pending
      if ($scope.search && $scope.search.so && !order.so.toLowerCase().includes($scope.search.so.toLowerCase())) {
        return false;
      }
      if (
        $scope.search &&
        $scope.search.client &&
        !order.client.toLowerCase().includes($scope.search.client.toLowerCase())
      ) {
        return false;
      }
      if ($scope.search && $scope.search.source && order.source !== $scope.search.source) {
        return false;
      }
      return true;
    };
  },
]);
