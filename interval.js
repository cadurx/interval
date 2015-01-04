/* Javascript object to try to mimic postgres's neat interval data type. 100% compatibility with
 * postgres is the goal. Synopsis:
 *
 * var m = new Interval('2 months');
 * var w = new Interval('1 week');
 *
 * alert(w); // shows "7 days" like postgres
 *
 * var i = m.add(w); // modifying methods return new objects.
 *
 * alert(i); // shows "2 mons 7 days"
 *
 * var today = new Date();
 * var last_week = new Date(); last_week.setDate(last_week.getDate() - 7);
 *
 * You can pass two dates to the constructor to get distance between them.
 * Note this will never return a month amount, just a day count (like postgres).
 *
 * var how_long = new Interval(last_week, today); // "7 days" (possibly "7 days 00:00:01".. pay attention!)
 *
 * var longer = how_long.mult(2); // "14 days"
 *
 * var strange = new Date();
 * strange.setMonth(0); strange.setDate(31); // january 31st
 * var new_strange_date = new Interval('1 month').add(strange);
 *
 * alert(new_strange_date); // will now have february 28th.  note this is different than default js behavior.
 *
 * */

(function() {
	window.Interval = Interval;

	function Interval(a, b) {
		if (this === window) {
			throw 'Interval() must be called with new';
		}

		// methods
		this.add = add;
		this.mult = mult;
		this.toString = toString;

		// properties
		this._seconds = 0;
		this._days = 0;
		this._months = 0;

		// construction
		if (a && b && a instanceof Date && b instanceof Date) {
			// distance between two dates
			_from_dates.call(this, a, b);
		} else if (a && a instanceof Interval) {
			// clone another interval
			this._seconds = a._seconds;
			this._days = a._days;
			this._months = a._months;
		} else if (a && isString(a) && b === undefined) {
			// try to parse string
			_parse.call(this, a);
		} else {
			throw 'Interval() bad construction: pass a string or two dates or another interval to clone';
		}
	}

	function add(v) {
		var out;

		// add to another interval? returns new interval
		if (v instanceof Interval) {
			out = new Interval(this);

			out._seconds += v._seconds;
			out._days += v._days;
			out._months += v._months;

			return out;
		}

		// add to date? returns new date.
		// this is where the real magic happens.
		if (v instanceof Date) {
			// clone date
			out = new Date();
			out.setTime(v.getTime());

			var s = out.getHours() * 60 * 60 + out.getMinutes() * 60 + out.getSeconds();
			out.setHours(0);
			out.setMinutes(0);
			out.setSeconds(0);

			// operate months. do some magic so it mimics postgres.
			// e.g. 2009-1-31 + 1 month = 2009-2-28, not march second.
			var day_temp = out.getDate();
			out.setDate(1);
			out.setMonth(out.getMonth() + this._months);
			out.setDate(day_temp);
			if (day_temp > 20) {
				// pull back a day until we are at the end of the month
				while (out.getDate() < 20)
					out.setDate(out.getDate() - 1);
			}

			// now operate days
			out.setDate(out.getDate() + this._days);

			// now seconds
			out.setSeconds(s + this._seconds);

			return out;
		}

		throw 'interval.add() type error: must be date or another interval';
	}

	// multiply with scalar. returns new interval

	function mult(v) {
		// clone ourselves
		var out = new Interval(this);

		out._seconds *= v;
		out._days *= v;
		out._months *= v;

		return out;
	}

	function toString() {
		if (!this._seconds && !this._days && !this._months) return '00:00:00';

		var out = '';

		var m = this._months;

		if (m && m >= 12) {
			if (out.length) out += ' ';
			out += _plural(Math.floor(this._months / 12), 'year');
			m = m % 12;
		}

		if (m) {
			if (out.length) out += ' ';
			out += _plural(m, 'mon');
		}

		if (this._days) {
			if (out.length) out += ' ';
			out += _plural(this._days, 'day');
		}

		if (this._seconds) {
			if (out.length) out += ' ';

			var hours = (Math.floor((this._seconds / 60) / 60)) + '';
			var minutes = (Math.floor(this._seconds / 60) % 60) + '';
			var seconds = (this._seconds % 60) + '';

			if (hours.length == 1) hours = '0' + hours;
			if (minutes.length == 1) minutes = '0' + minutes;
			if (seconds.length == 1) seconds = '0' + seconds;

			out += hours + ':' + minutes + ':' + seconds;
		}

		return out;
	}

	function _from_dates(a, b) {
		// distance between two dates will create days and seconds. never months!
		this._months = 0;

		var seconds = Math.floor((b.getTime() - a.getTime()) / 1000);

		this._days = Math.floor(((seconds / 60) / 60) / 24);
		this._seconds = seconds % (24 * 60 * 60);
	}

	function _test_number(v) {
		var i, c;
		for (i = 0; i < v.length; i++) {
			c = v.charAt(i);
			if (c < '0' || c > '9') return false;
		}
		return true;
	}

	function _parse(txt) {
		this._months = 0;
		this._days = 0;
		this._seconds = 0;

		var chunks = txt.split(' ');

		var i, v, u;

		for (i = 0; i < chunks.length; i++) {
			if (chunks[i].indexOf(':') != -1) {
				// try to parse time segment
				// croak for now TODO support this
				throw 'time intervals not yet implemented';
			} else if (i == chunks.length - 1) {
				_parse_throw(txt);
			} else {
				v = chunks[i];
				u = chunks[i + 1];
				i++;

				// first chunk must be number
				if (!_test_number(v)) _parse_throw(txt);

				v = parseInt(v, 10);

				if (u == 's' || u == 'sec' || u == 'secs' || u == 'second' || u == 'seconds') this._seconds += v;
				else if (u == 'm' || u == 'min' || u == 'mins' || u == 'minute' || u == 'minutes') this._seconds += (v * 60);
				else if (u == 'h' || u == 'hr' || u == 'hrs' || u == 'hour' || u == 'hours') this._seconds += (v * 60 * 60);
				else if (u == 'd' || u == 'day' || u == 'days') this._days += v;
				else if (u == 'w' || u == 'wk' || u == 'wks' || u == 'week' || u == 'weeks') this._days += (v * 7);
				else if (u == 'mon' || u == 'mons' || u == 'month' || u == 'months') this._months += v;
				else if (u == 'y' || u == 'yr' || u == 'yrs' || u == 'year' || u == 'years') this._months += (v * 12);
				else _parse_throw(txt);
			}
		}
	}

	function _parse_throw(txt) {
		throw 'invalid input syntax for type interval: "' + txt + '"';
	}

	function _plural(amt, str) {
		if (amt == 1) return '1 ' + str;

		return amt + ' ' + str + 's';
	}

})();
