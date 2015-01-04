interval
========

Javascript object to try to mimic postgres's neat interval data type. 100%
compatibility with postgres is the goal. Synopsis:

var m = new Interval('2 months');
var w = new Interval('1 week');

alert(w); // shows "7 days" like postgres

var i = m.add(w); // modifying methods return new objects.

alert(i); // shows "2 mons 7 days"

var today = new Date();
var last_week = new Date(); last_week.setDate(last_week.getDate() - 7);

You can pass two dates to the constructor to get distance between them.
Note this will never return a month amount, just a day count (like postgres).

var how_long = new Interval(last_week, today); // "7 days" (possibly "7 days 00:00:01".. pay attention!)

var longer = how_long.mult(2); // "14 days"

var strange = new Date();
strange.setMonth(0); strange.setDate(31); // january 31st
var new_strange_date = new Interval('1 month').add(strange);

alert(new_strange_date); // will now have february 28th.  note this is different than default js behavior.
