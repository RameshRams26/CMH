angular.module('pickApp', []).controller('MainCtrl', [
  '$scope',
  '$window',
  function ($scope, $window) {
    var vm = this;
    vm.step = 1;
    // Simulated logged-in user/location
    vm.loggedInUser = 'Eshwar';
    vm.loggedInLocation = { locationId: 'LOC-2', label: 'Floor 2 - Zone A' };

    // Demo pickers and locations
    vm.pickers = ['Eshwar', 'Sam', 'Asha', 'Maya'];
    vm.locations = [
      { locationId: 'LOC-1', label: 'Floor 1 - Zone A' },
      { locationId: 'LOC-2', label: 'Floor 2 - Zone A' },
      { locationId: 'LOC-3', label: 'Floor 1 - Zone B' },
    ];

    $scope.loading = false;

    $scope.goBack = function () {
      $window.history.back();
    };

    // Demo orders (items include itemLocationId + label)
    vm.orders = [
      {
        id: 'SO1001',
        customer: 'Health Active',
        assignedTo: 'Eshwar',
        tags: ['Priority', 'Zone A'],
        lines: [
          {
            itemId: 'ITEM-100',
            itemName: 'Vitamin C 500mg',
            upc: '123456789012',
            orderQty: 10,
            pickedQty: 0,
            itemLocationId: 'LOC-1',
            itemLocationLabel: 'Floor 1 - Zone A',
            assignedBins: [
              { binId: 'A-01', assigned: 6, picked: 0 },
              { binId: 'A-02', assigned: 4, picked: 0 },
            ],
          },
          {
            itemId: 'ITEM-200',
            itemName: 'Omega 3',
            upc: '999888777666',
            orderQty: 8,
            pickedQty: 0,
            itemLocationId: 'LOC-2',
            itemLocationLabel: 'Floor 2 - Zone A',
            assignedBins: [{ binId: 'B-10', assigned: 8, picked: 0 }],
          },
        ],
      },
      {
        id: 'SO1002',
        customer: 'Wellness Mart',
        assignedTo: 'Sam',
        tags: ['Standard', 'Zone B'],
        lines: [
          {
            itemId: 'ITEM-100',
            itemName: 'Vitamin C 500mg',
            upc: '123456789012',
            orderQty: 14,
            pickedQty: 0,
            itemLocationId: 'LOC-1',
            itemLocationLabel: 'Floor 1 - Zone A',
            assignedBins: [
              { binId: 'A-01', assigned: 4, picked: 0 },
              { binId: 'A-02', assigned: 7, picked: 0 },
              { binId: 'A-03', assigned: 3, picked: 0 },
            ],
          },
        ],
      },
    ];

    // Mock: global live bin availability (would come from search/API)
    vm.binAvailability = {
      'A-01': { onHand: 4, reservedOther: 0 }, // dropped from 6 → 4
      'A-02': { onHand: 7, reservedOther: 4 }, // 3 free
      'A-03': { onHand: 5, reservedOther: 2 },
      'B-10': { onHand: 8, reservedOther: 0 },
    };

    vm.openOrder = function (order) {
      vm.activeOrder = order;
      vm.step = 2;
    };
    vm.startPicking = vm.openOrder;
    vm.backToOrders = function () {
      vm.step = 1;
      vm.activeOrder = null;
    };
    vm.goToResolve = function (line) {
      vm.step = 3;
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
  },
]);
