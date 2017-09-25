import { Util } from './util';
import { DateTime } from '../datetime';

function stringifyTokens(splits, tokenToString) {
  let s = '';
  for (const token of splits) {
    if (token.literal) {
      s += token.val;
    } else {
      s += tokenToString(token.val);
    }
  }
  return s;
}

/**
 * @private
 */

export class Formatter {
  static create(locale, opts = {}) {
    const formatOpts = Object.assign({}, { round: true }, opts);
    return new Formatter(locale, formatOpts);
  }

  static parseFormat(fmt) {
    let current = null,
      currentFull = '',
      bracketed = false;
    const splits = [];
    for (let i = 0; i < fmt.length; i++) {
      const c = fmt.charAt(i);
      if (c === "'") {
        if (currentFull.length > 0) {
          splits.push({ literal: bracketed, val: currentFull });
        }
        current = null;
        currentFull = '';
        bracketed = !bracketed;
      } else if (bracketed) {
        currentFull += c;
      } else if (c === current) {
        currentFull += c;
      } else {
        if (currentFull.length > 0) {
          splits.push({ literal: false, val: currentFull });
        }
        currentFull = c;
        current = c;
      }
    }

    if (currentFull.length > 0) {
      splits.push({ literal: bracketed, val: currentFull });
    }

    return splits;
  }

  constructor(locale, formatOpts) {
    this.opts = formatOpts;
    this.loc = locale;
  }

  formatDateTime(dt, opts = {}) {
    const [df, d] = this.loc.dtFormatter(dt, Object.assign({}, this.opts, opts));
    return df.format(d);
  }

  formatDateTimeParts(dt, opts = {}) {
    const [df, d] = this.loc.dtFormatter(dt, Object.assign({}, this.opts, opts));
    return df.format(d);
  }

  resolvedOptions(dt, opts = {}) {
    const [df, d] = this.loc.dtFormatter(dt, Object.assign({}, this.opts, opts));
    return df.resolvedOptions(d);
  }

  num(n, p = 0) {
    const opts = Object.assign({}, this.opts);

    if (p > 0) {
      opts.padTo = p;
    }

    return this.loc.numberFormatter(opts).format(n);
  }

  formatDateTimeFromString(dt, fmt) {
    const string = (opts, extract) => this.loc.extract(dt, opts, extract),
      formatOffset = opts => {
        if (dt.isOffsetFixed && dt.offset === 0 && opts.allowZ) {
          return 'Z';
        }

        const hours = Util.towardZero(dt.offset / 60),
          minutes = Math.abs(dt.offset % 60),
          sign = hours >= 0 ? '+' : '-',
          base = `${sign}${Math.abs(hours)}`;

        switch (opts.format) {
          case 'short':
            return `${sign}${this.num(Math.abs(hours), 2)}:${this.num(minutes, 2)}`;
          case 'narrow':
            return minutes > 0 ? `${base}:${minutes}` : base;
          case 'techie':
            return `${sign}${this.num(Math.abs(hours), 2)}${this.num(minutes, 2)}`;
          default:
            throw new RangeError(`Value format ${opts.format} is out of range for property format`);
        }
      },
      tokenToString = token => {
        const outputCal = this.loc.outputCalendar;

        // Where possible: http://cldr.unicode.org/translation/date-time#TOC-Stand-Alone-vs.-Format-Styles
        switch (token) {
          // ms
          case 'S':
            return this.num(dt.millisecond);
          case 'SSS':
            return this.num(dt.millisecond, 3);
          // seconds
          case 's':
            return this.num(dt.second);
          case 'ss':
            return this.num(dt.second, 2);
          // minutes
          case 'm':
            return this.num(dt.minute);
          case 'mm':
            return this.num(dt.minute, 2);
          // hours
          case 'h':
            return this.num(dt.hour === 12 ? 12 : dt.hour % 12);
          case 'hh':
            return this.num(dt.hour === 12 ? 12 : dt.hour % 12, 2);
          case 'H':
            return this.num(dt.hour);
          case 'HH':
            return this.num(dt.hour, 2);
          // offset
          case 'Z':
            // like +6
            return formatOffset({ format: 'narrow', allowZ: true });
          case 'ZZ':
            // like +06:00
            return formatOffset({ format: 'short', allowZ: true });
          case 'ZZZ':
            // like +0600
            return formatOffset({ format: 'techie', allowZ: false });
          case 'ZZZZ':
            // like EST
            return dt.offsetNameShort;
          case 'ZZZZZ':
            // like Eastern Standard Time
            return dt.offsetNameLong;
          // zone
          case 'z':
            return dt.zoneName;
          // like America/New_York
          // meridiems
          case 'a':
            return string({ hour: 'numeric', hour12: true }, 'dayperiod');
          // dates
          case 'd':
            return outputCal ? string({ day: 'numeric' }, 'day') : this.num(dt.day);
          case 'dd':
            return outputCal ? string({ day: '2-digit' }, 'day') : this.num(dt.day, 2);
          // weekdays - format
          case 'c':
            // like 1
            return this.num(dt.weekday);
          case 'ccc':
            // like 'Tues'
            return string({ weekday: 'short' }, 'weekday');
          case 'cccc':
            // like 'Tuesday'
            return string({ weekday: 'long' }, 'weekday');
          case 'ccccc':
            // like 'T'
            return string({ weekday: 'narrow' }, 'weekday');
          // weekdays - standalone
          case 'E':
            // like 1
            return this.num(dt.weekday);
          case 'EEE':
            // like 'Tues'
            return string({ weekday: 'short', month: 'long', day: 'numeric' }, 'weekday');
          case 'EEEE':
            // like 'Tuesday'
            return string({ weekday: 'long', month: 'long', day: 'numeric' }, 'weekday');
          case 'EEEEE':
            // like 'T'
            return string({ weekday: 'narrow', month: 'long', day: 'numeric' }, 'weekday');
          // months - format
          case 'L':
            // like 1
            return string({ month: 'numeric', day: 'numeric' }, 'month');
          case 'LL':
            // like 01, doesn't seem to work
            return string({ month: '2-digit', day: 'numeric' }, 'month');
          case 'LLL':
            // like Jan
            return string({ month: 'short', day: 'numeric' }, 'month');
          case 'LLLL':
            // like January
            return string({ month: 'long' }, 'month');
          case 'LLLLL':
            // like J
            return string({ month: 'narrow' }, 'month');
          // months - standalone
          case 'M':
            // like 1
            return outputCal ? string({ month: 'numeric' }, 'month') : this.num(dt.month);
          case 'MM':
            // like 01
            return outputCal ? string({ month: '2-digit' }, 'month') : this.num(dt.month, 2);
          case 'MMM':
            // like Jan
            return string({ month: 'short', day: 'numeric' }, 'month');
          case 'MMMM':
            // like January
            return string({ month: 'long', day: 'numeric' }, 'month');
          case 'MMMMM':
            // like J
            return string({ month: 'narrow' }, 'month');
          // years
          case 'y':
            // like 2014
            return outputCal ? string({ year: 'numeric' }, 'year') : this.num(dt.year);
          case 'yy':
            // like 14
            return outputCal
              ? string({ year: '2-digit' }, 'year')
              : this.num(dt.year.toString().slice(-2), 2);
          case 'yyyy':
            // like 0012
            return outputCal ? string({ year: 'numeric' }, 'year') : this.num(dt.year, 4);
          // eras
          case 'G':
            // like AD
            return string({ era: 'short' }, 'era');
          case 'GG':
            // like Anno Domini
            return string({ era: 'long' }, 'era');
          case 'GGGGG':
            return string({ era: 'narrow' }, 'era');
          case 'kk':
            return this.num(dt.weekYear.toString().slice(-2), 2);
          case 'kkkk':
            return this.num(dt.weekYear, 4);
          case 'W':
            return this.num(dt.weekNumber);
          case 'WW':
            return this.num(dt.weekNumber, 2);
          case 'o':
            return this.num(dt.ordinal);
          case 'ooo':
            return this.num(dt.ordinal, 3);
          // macros
          case 'D':
            return this.formatDateTime(dt, DateTime.DATE_SHORT);
          case 'DD':
            return this.formatDateTime(dt, DateTime.DATE_MED);
          case 'DDD':
            return this.formatDateTime(dt, DateTime.DATE_FULL);
          case 'DDDD':
            return this.formatDateTime(dt, DateTime.DATE_HUGE);
          case 't':
            return this.formatDateTime(dt, DateTime.TIME_SIMPLE);
          case 'tt':
            return this.formatDateTime(dt, DateTime.TIME_WITH_SECONDS);
          case 'ttt':
            return this.formatDateTime(dt, DateTime.TIME_WITH_SHORT_OFFSET);
          case 'tttt':
            return this.formatDateTime(dt, DateTime.TIME_WITH_LONG_OFFSET);
          case 'T':
            return this.formatDateTime(dt, DateTime.TIME_24_SIMPLE);
          case 'TT':
            return this.formatDateTime(dt, DateTime.TIME_24_WITH_SECONDS);
          case 'TTT':
            return this.formatDateTime(dt, DateTime.TIME_24_WITH_SHORT_OFFSET);
          case 'TTTT':
            return this.formatDateTime(dt, DateTime.TIME_24_WITH_LONG_OFFSET);
          case 'f':
            return this.formatDateTime(dt, DateTime.DATETIME_SHORT);
          case 'ff':
            return this.formatDateTime(dt, DateTime.DATETIME_MED);
          case 'fff':
            return this.formatDateTime(dt, DateTime.DATETIME_FULL);
          case 'ffff':
            return this.formatDateTime(dt, DateTime.DATETIME_HUGE);
          case 'F':
            return this.formatDateTime(dt, DateTime.DATETIME_SHORT_WITH_SECONDS);
          case 'FF':
            return this.formatDateTime(dt, DateTime.DATETIME_MED_WITH_SECONDS);
          case 'FFF':
            return this.formatDateTime(dt, DateTime.DATETIME_FULL_WITH_SECONDS);
          case 'FFFF':
            return this.formatDateTime(dt, DateTime.DATETIME_HUGE_WITH_SECONDS);

          default:
            return token;
        }
      };

    return stringifyTokens(Formatter.parseFormat(fmt), tokenToString);
  }

  formatDuration() {}

  formatDurationFromString(dur, fmt) {
    const tokenToField = token => {
        switch (token[0]) {
          case 'S':
            return 'millisecond';
          case 's':
            return 'second';
          case 'm':
            return 'minute';
          case 'h':
            return 'hour';
          case 'd':
            return 'day';
          case 'M':
            return 'month';
          case 'y':
            return 'year';
          default:
            return null;
        }
      },
      tokenToString = lildur => token => {
        const mapped = tokenToField(token);
        if (mapped) {
          return this.num(lildur.get(mapped), token.length);
        } else {
          return token;
        }
      },
      tokens = Formatter.parseFormat(fmt),
      realTokens = tokens.reduce(
        (found, { literal, val }) => (literal ? found : found.concat(val)),
        []
      ),
      collapsed = dur.shiftTo(...realTokens.map(tokenToField).filter(t => t));
    return stringifyTokens(tokens, tokenToString(collapsed));
  }
}
