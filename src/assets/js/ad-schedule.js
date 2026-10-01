// Which sale ad is live on a given day (see the schedule in README.md).
// The site build and the browser both use this, so the home page banner
// and the sale tags switch over on the right day without a rebuild.
(function (root) {
  function nthWeekday(y, month, weekday, n) {
    var d = new Date(y, month, 1);
    d.setDate(1 + ((weekday - d.getDay() + 7) % 7) + 7 * (n - 1));
    return d;
  }
  function lastWeekday(y, month, weekday) {
    var d = new Date(y, month + 1, 0);
    d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7));
    return d;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  // Each ad with the last day it is live, in calendar order.
  function lastDays(y) {
    var thanksgiving = nthWeekday(y, 10, 4, 4);
    return [
      ["holiday", new Date(y, 0, 5)],
      ["presidents", nthWeekday(y, 1, 1, 3)],    // Presidents' Day, third Monday in February
      ["spring", new Date(y, 3, 30)],
      ["memorial", lastWeekday(y, 4, 1)],        // Memorial Day, last Monday in May
      ["july4", new Date(y, 6, 5)],
      ["labor", nthWeekday(y, 8, 1, 1)],         // Labor Day, first Monday in September
      ["fall", addDays(thanksgiving, -3)],       // Monday before Thanksgiving
      ["blackfriday", addDays(thanksgiving, 4)], // Cyber Monday
      ["holiday", new Date(y + 1, 0, 5)]
    ];
  }

  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function current(date) {
    var today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var list = lastDays(today.getFullYear());
    for (var i = 0; i < list.length; i++) {
      if (today <= list[i][1]) {
        var ends = list[i][1];
        return { id: list[i][0], ends: "Sale ends " + months[ends.getMonth()] + " " + ends.getDate() };
      }
    }
  }

  root.BBBAdSchedule = { current: current };
})(typeof window !== "undefined" ? window : this);
