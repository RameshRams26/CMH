//angular.module('deliverHandlingApp', []).controller('deliverHandlingCtrl', function ($scope) {

angular.module('deliverHandlingApp', []).controller('deliverHandlingCtrl', [
  '$scope',
  '$window',
  function ($scope, $window) {
    // Sample Orders
    $scope.goBack = function () {
      $window.history.back();
    };
    $scope.transfers = [
      {
        tracking: 'TRK001',
        so: 'SO124',
        if: 'IF457',
        customer: 'ABC Retailers',
        lines: [
          { item: 'Item C', qty: 4, fromBin: 'SB2', toBin: '', status: 'Pending Transfer' },
          { item: 'Item D', qty: 2, fromBin: 'SB2', toBin: '', status: 'Pending Transfer' },
        ],
      },
      {
        tracking: 'TRK002',
        so: 'SO125',
        if: 'IF458',
        customer: 'XYZ Distributors',
        lines: [{ item: 'Item E', qty: 3, fromBin: 'SB3', toBin: '', status: 'Pending Transfer' }],
      },
    ];

    $scope.activeOrder = null;
    $scope.selectedLine = {};

    // Step 1 → Step 2
    $scope.startOrder = function (order) {
      $scope.activeOrder = order;
    };

    // Back to orders
    $scope.backToOrders = function () {
      $scope.activeOrder = null;
    };

    // Open modal
    $scope.openModal = function (line) {
      $scope.selectedLine = line;
      var modal = new bootstrap.Modal(document.getElementById('binModal'));
      modal.show();
    };

    // Submit transfer
    $scope.submitTransfer = function () {
      if (!$scope.selectedLine.targetBin) {
        alert('Please scan/enter target bin.');
        return;
      }

      // Backend call placeholder
      console.log('Bin Transfer Created:', {
        so: $scope.activeOrder.so,
        if: $scope.activeOrder.if,
        item: $scope.selectedLine.item,
        qty: $scope.selectedLine.qty,
        fromBin: $scope.selectedLine.fromBin,
        toBin: $scope.selectedLine.targetBin,
      });

      // Update UI
      $scope.selectedLine.toBin = $scope.selectedLine.targetBin;
      $scope.selectedLine.status = 'Transferred';
      $scope.selectedLine.targetBin = '';

      // Close modal
      var modalEl = document.getElementById('binModal');
      var modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();
    };
  },
]);
