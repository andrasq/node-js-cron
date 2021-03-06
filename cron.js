/**
 * qcron -- very simple js call scheduler
 * Calls the handler once at a predetermined time, or repeatedly on a schedule,
 *
 * 2019-02-20 - AR.
 */

'use strict';

var singleton = new Cron();
module.exports = singleton;
module.exports.Cron = Cron;

var invoke;
// invoke the fastest way available.  Double-eval for 100% coverage, but test with old node too.
eval("invoke = function(fn, I, av) { fn.apply(I, av) }");
try { eval("invoke = function(fn, I, av) { I ? fn.apply(I, av) : fn(...av) }") } catch(e) {}

function Cron( options ) {
    options = options || {};
    this.jobs = new Array();
}
Cron.msPerDay = 24 * 60 * 60 * 1000;

Cron.prototype.scheduleCall = function scheduleCall( func, at, repeat ) {
    var options = gatherCallArgs({ func: null, args: [], repeat: 0 }, func, at, repeat);

    if (typeof options.func !== 'function') throw new Error('func not a function');
    if (typeof options.at !== 'number') throw new Error('at not a number');
    if (!Array.isArray(options.args)) throw new Error('args not an array');

    var job = {
        func: options.func, args: options.args, _at: options.at, _repeat: options.repeat,
        _cron: this, _self: options.self || null, _timer: null, _start: null,
        pause: function() { clearTimeout(this._timer); this._timer = null },
        resume: function() { if (!this._timer) startTimer(this) }
    };

    startTimer(job);
    this.jobs.push(job);
    return job;

    function startTimer(job) {
        // use setTimeout to be in control of our schedule
        var now = new Date();
        job._start = job._cron._findNextRuntime(now, job._at, job._repeat);
        job._timer = setTimeout(runCall, job._start - +now, job);
        job._timer.unref && job._timer.unref();
    }

    function runCall(job) {
        // run func first to not overlap next run
        invoke(job.func, job._self, job.args);
        // _timer is cleared if the job is paused
        if (job._repeat > 0 && job._timer) startTimer(job); else job._cron.cancelCall(job);
    }
}

// note: cancel is O(n)
Cron.prototype.cancelCall = function cancelCall( funcOrInfo ) {
    var jobs = this.jobs;
    this.jobs = new Array();
    var removed = new Array();
    for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        if (job.func === funcOrInfo || job === funcOrInfo || funcOrInfo === '_all') {
            job.pause();
            removed.push(job);
        } else {
            this.jobs.push(job);
        }
    }
    return removed;
}

Cron.prototype.setTimeout = function setTimeout( func, ms, repeat ) {
    var options = gatherCallArgs({ at: 0, repeat: 0 }, func, ms, repeat);
    if (typeof options.at === 'number') options.at += new Date().getTime() % Cron.msPerDay;
    return this.scheduleCall(options);
}

// given ms after midnight and ms between runs, find the next scheduled runtime in GMT
Cron.prototype._findNextRuntime = function _findNextRuntime( nowDate, offset, interval ) {
    if (offset >= nowDate) return offset;
    var midnight = nowDate - nowDate % Cron.msPerDay;
    var next = midnight + offset;
    if (!(interval > 0)) interval = Cron.msPerDay;  // pretend daily if missing
    if (next < +nowDate) next += interval * Math.ceil((nowDate - next) / interval);
    if (next <= +nowDate) next += interval;
    return next;
}

function gatherCallArgs( options, func, at, interval ) {
    var src = (typeof func === 'object' && at === undefined && interval === undefined) ? func : { func: func, at: at, repeat: interval };
    for (var k in src) if (src[k] !== undefined) options[k] = src[k];
    options.at = parseMs(options.at);
    options.repeat = parseMs(options.repeat);
    return options;
}

var unitScale = { 'd': 86400000, 'h': 3600000, 'm': 60000, 's': 1000, '': 1 };
function parseMs( ms ) {
    if (typeof ms !== 'string') return ms;

    var at = 0, match;
    while ((match = /(\s*(now|[.]\d+|\d+[.]\d*|\d+)\s*([dhms]|))/g.exec(ms))) {
        ms = ms.slice(match[1].length);
        if (match[2] === 'now') at += new Date().getTime();
        else at += +match[2] * unitScale[match[3]];
    }
    if (ms.trim().length > 0) throw new Error(ms + ': bad time format, expected number[dhms]');

    return at;
}

Cron.prototype = toStruct(Cron.prototype);
function toStruct(hash) { return toStruct.prototype = hash }
