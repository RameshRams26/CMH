angular.module('pickApp', []).controller('MainCtrl', [
  '$scope',
  '$window',
  '$http',
  function ($scope, $window, $http) {
    let jsonText = document.getElementById('myDataObj').textContent;
    $scope.urlObj = JSON.parse(jsonText);
    var ajaxUrl = $scope.urlObj['ajaxUrl'];
    $scope.loading = false;
    var vm = this;
    vm.step = 1;
    vm.scanBin = '';
    vm.filteredItems = [];

    $scope.goBack = function () {
      $window.history.back();
    };

    $scope.filters = {
      search: '',
      assignOrder: '',
    };

    $scope.orderSearchFilter = function (order) {
      var search = ($scope.filters.search || '').toLowerCase();
      if (!search) return true;
      return (
        (order.orderId && order.orderId.toLowerCase().indexOf(search) !== -1) ||
        (order.customer && order.customer.toLowerCase().indexOf(search) !== -1)
      );
    };

    $scope.get_lists = function () {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            '&empId=' +
            $scope.urlObj['empId'] +
            '&ref=get_lists' +
            '&locationId=' +
            $scope.urlObj['locationId'],
        )
        .then(
          function (response) {
            let data = response['data'];
            vm.pickers = data['pickers'];
            vm.orders = data['assigned_orders'];
            vm.locObj = data['locationObj'];

            $scope.loading = false;
          },
          function (response) {
            $scope.loading = false;
            alert('error::::::');
          },
        );
    };

    $scope.get_lists();

    $scope.assignOrder = function () {
      var locationId = $scope.urlObj['locationId'];
      var empId = $scope.urlObj['empId'];
      var assignOrder = $scope.filters.assignOrder;
      if (!assignOrder) {
        return;
      }

      $scope.loading = true;
      $http({
        method: 'POST',
        url: ajaxUrl + '&ref=assign_order',
        data: {
          locationId: locationId,
          empId: empId,
          assignOrder: assignOrder.trim(),
        },
      }).then(
        function (response) {
          $scope.loading = false;
          if (response.data.error) {
            alert(response.data.error);
            $scope.filters.assignOrder = '';
            return;
          }

          if (response.data.assignmentId) {
            confirm('Order assigned successfully');
            vm.startPicking(response.data.assignmentId);
          }
        },
        function (error) {
          $scope.loading = false;
          alert('Failed to assign order');
        },
      );
    };

    vm.startPicking = function (assignmentId) {
      $scope.loading = true;
      $http
        .get(
          ajaxUrl +
            '&ref=get_assignment_items&empId=' +
            $scope.urlObj['empId'] +
            '&assignmentId=' +
            encodeURIComponent(assignmentId),
        )
        .then(
          function (response) {
            $scope.loading = false;
            vm.activeOrder = response.data; // Expecting item details in response.data
            vm.step = 2;
            $scope.$applyAsync();
          },
          function (error) {
            $scope.loading = false;
            alert('Failed to load assignment item details');
          },
        );
    };

    vm.backToOrders = function () {
      vm.step = 1;
      vm.activeOrder = null;
    };

    vm.reviewAll = function () {
      vm.step = 3;
    };

    // Show reassign only when location mismatch OR more than one bin/zone exists for the item
    vm.showReassign = function (line) {
      var locationMismatch = line.itemLocationId && line.itemLocationId !== vm.loggedInLocation.locationId;
      var multipleZones = line.assignedBins && line.assignedBins.length > 1;
      return locationMismatch || multipleZones;
    };

    // Mode: 'location' when item location != logged-in location; 'zones' when multiple zones within same location
    vm.reassignMode = function (line) {
      if (line.itemLocationId && line.itemLocationId !== vm.loggedInLocation.locationId) return 'location';
      if (line.assignedBins && line.assignedBins.length > 1) return 'zones';
      return null;
    };

    // Open reassign modal (item-level)
    vm.openReassign = function (line) {
      var mode = vm.reassignMode(line);
      vm.modal = {
        item: line,
        mode: mode,
        zoneOptions: [],
        targetPicker: vm.pickers[0],
        targetLocation: vm.locations[0],
      };

      if (mode === 'zones') {
        // prepare zone options (clone assigned bins)
        vm.modal.zoneOptions = line.assignedBins.map(function (b) {
          return { binId: b.binId, assigned: b.assigned, picked: b.picked || 0, _checked: false, _reassignQty: 0 };
        });
      }

      var modalEl = document.getElementById('reassignModal');
      vm._reassignModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      vm._reassignModal.show();
    };

    // Apply reassign (handles both modes)
    vm.applyReassign = function () {
      var m = vm.modal;
      if (!m) return;

      if (m.mode === 'location') {
        // Full location reassignment: mark item lines as reassigned to a picker and location
        var line = m.item;
        line.reassignedTo = m.targetPicker;
        line.reassignedLocation = m.targetLocation;
        // annotate each bin row for traceability
        line.assignedBins.forEach(function (b) {
          b.reassignedTo = m.targetPicker;
          b.reassignedLocation = m.targetLocation;
        });
      } else if (m.mode === 'zones') {
        // For each selected zone, create a new mini-line with reassignedTo or mark existing
        var line = m.item;
        m.zoneOptions.forEach(function (z) {
          if (!z._checked) return;
          var qty = Number(z._reassignQty) || 0;
          if (!qty) return;
          // find original assigned bin and reduce
          var orig = line.assignedBins.find(function (x) {
            return x.binId === z.binId;
          });
          if (orig) {
            orig.assigned -= qty;
          }
          // create a reassigned bin row (simulate creating a child record for another picker)
          line.assignedBins.push({ binId: z.binId, assigned: qty, picked: 0, reassignedTo: m.targetPicker });
        });
      }

      vm._reassignModal.hide();
      $scope.$applyAsync();
    };

    // Validate one item bin against live availability and prepare suggestions
    vm.resolveShortage = function (line, bin) {
      vm.modal = { item: line, bin: bin };
      var live = vm.binAvailability[bin.binId]?.onHand || 0;
      var usable = Math.min(live, bin.assigned);
      var shortfall = Math.max(0, bin.assigned - usable);
      vm.modal.shortfall = shortfall;

      var fifoOrder = Object.keys(vm.binAvailability);
      var suggestions = [];
      var remaining = shortfall;

      // Reuse remaining free qty in the same bin first
      var freeSame = Math.max(0, vm.binAvailability[bin.binId].onHand - (bin.assigned - shortfall));
      if (freeSame > 0 && remaining > 0) {
        var takeSame = Math.min(freeSame, remaining);
        suggestions.push({ binId: bin.binId, freeQty: freeSame, takeQty: takeSame, sameBin: true });
        remaining -= takeSame;
      }

      // Then other bins in FIFO
      for (var i = 0; i < fifoOrder.length && remaining > 0; i++) {
        var bId = fifoOrder[i];
        if (bId === bin.binId) continue;
        var meta = vm.binAvailability[bId];
        if (!meta) continue;
        var free = Math.max(0, meta.onHand - meta.reservedOther);
        if (free <= 0) continue;
        var take = Math.min(free, remaining);
        suggestions.push({ binId: bId, freeQty: free, takeQty: take });
        remaining -= take;
      }

      vm.modal.suggestions = suggestions;
      var modalEl = document.getElementById('nextBinModal');
      vm._nextModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      vm._nextModal.show();
    };
    vm.goToResolve = function (item) {
      if (!item || !item.proposedBins || !item.proposedBins.length) {
        alert('No bins to pick for this item.');
        return;
      }
      vm.modal = { item: item, bins: item.proposedBins };
      var modalEl = document.getElementById('nextBinModal');
      vm._nextModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      vm._nextModal.show();
    };

    vm.applyNextBins = function () {
      var line = vm.modal.item;
      var bin = vm.modal.bin;
      var totalTake = 0;
      (vm.modal.suggestions || []).forEach(function (s) {
        totalTake += Number(s.takeQty) || 0;
      });
      if (totalTake <= 0) {
        vm._nextModal.hide();
        return;
      }

      // determine what is usable in original bin and reduce it
      var usable = Math.min(vm.binAvailability[bin.binId].onHand, bin.assigned);
      var reduce = bin.assigned - usable;
      bin.assigned = usable;

      // apply suggestions (merge existing or add)
      (vm.modal.suggestions || []).forEach(function (s) {
        var take = Number(s.takeQty) || 0;
        if (!take) return;
        var existing = line.assignedBins.find(function (x) {
          return x.binId === s.binId && !x.reassignedTo;
        });
        if (existing) existing.assigned += take;
        else line.assignedBins.push({ binId: s.binId, assigned: take, picked: 0 });
        vm.binAvailability[s.binId].onHand = Math.max(0, vm.binAvailability[s.binId].onHand - take);
      });

      // update availability of original bin
      vm.binAvailability[bin.binId].onHand = Math.max(0, vm.binAvailability[bin.binId].onHand - bin.assigned);

      vm._nextModal.hide();
      $scope.$applyAsync();
    };

    vm.resolveItem = function (line) {
      line.assignedBins.forEach(function (bin) {
        var live = vm.binAvailability[bin.binId]?.onHand || 0;
        if (live < bin.assigned) {
          vm.resolveShortage(line, bin);
        }
      });
    };

    vm.confirmFulfillment = function () {
      alert('Confirmation submitted. In production, this would create Item Fulfillment and update assignments.');
    };

    vm.onScanBin = function () {
      var binInput = (vm.scanBin || '').trim();
      if (!binInput) return;

      // Find items with this bin in proposedBins
      var matchingItems = (vm.activeOrder.items || []).filter(function (item) {
        return (item.proposedBins || []).some(function (bin) {
          return bin.binId === binInput || bin.binText === binInput;
        });
      });

      if (matchingItems.length === 0) {
        alert('No items found for this bin.');
        vm.scanBin = '';
        vm.filteredItems = [];
        return;
      }
      if (matchingItems.length === 1) {
        // Directly open popup for the only matching item
        vm.goToResolve(matchingItems[0]);
        vm.filteredItems = [];
        return;
      }
      // Show filtered items for user to select
      vm.filteredItems = matchingItems;
    };

    vm.clearBinFilter = function () {
      vm.scanBin = '';
      vm.filteredItems = [];
    };
  },
]);
