'use strict';

var cron = require('./');
var Cron = cron.Cron;

module.exports = {
    setUp: function(done) {
        cron.cancelCall('_all');
        done();
    },

    'should throw if missing required params': function(t) {
        t.throws(function() { cron.scheduleCall() }, /not a function/);
        t.throws(function() { cron.scheduleCall({}) }, /not a function/);
        t.throws(function() { cron.scheduleCall(noop) }, /not a number/);
        t.throws(function() { cron.scheduleCall(noop, "three") }, /expected number/);
        t.throws(function() { cron.scheduleCall(noop, 3, "four") }, /expected number/);
        t.throws(function() { cron.scheduleCall({ func: noop, at: 0, args: 123 }) }, /not an array/);

        cron.scheduleCall(noop, offsetNow(2), 0);
        cron.scheduleCall({ func: function() { t.done() }, at: offsetNow(4) });
    },

    'should pass args': function(t) {
        t.expect(2);
        cron.scheduleCall({ at: offsetNow(2), args: [123], func: function(a, b, c) { t.deepEqual(a, 123); }});
        cron.scheduleCall({ at: offsetNow(2), args: [1, 2, 3], func: function(a, b, c) { t.deepEqual([a, b, c], [1, 2, 3]); }});
        setTimeout(function() { t.done() }, 10);
    },

    'should invoke with this set to self': function(t) {
        var self = {};
        cron.scheduleCall({ at: offsetNow(10), self: self, func: function() {
            t.equal(this, self);
            t.done();
        }})
    },

    'should invoke one-shot without repeat': function(t) {
        var job = cron.scheduleCall(noop, offsetNow(10));
        t.ok(job._start > Date.now());
        t.done();
    },

    'should accept human-legible time spec': function(t) {
        var job;
        job = cron.scheduleCall(noop, 0, '1000');
        t.equal(job._repeat, 1000);
        t.equal(cron.scheduleCall(noop, 0, '2h')._repeat, 7200000);
        t.equal(cron.scheduleCall(noop, 0, '3m')._repeat, 180000);
        t.equal(cron.scheduleCall(noop, 0, '4s')._repeat, 4000);
        t.equal(cron.scheduleCall(noop, 0, '4.5s')._repeat, 4500);
        t.equal(cron.scheduleCall(noop, 0, '.5s 4000')._repeat, 4500);
        t.equal(cron.scheduleCall(noop, 0, '4.5s 100')._repeat, 4600);
        t.equal(cron.scheduleCall(noop, 0, '1d 2 h 3m4s5')._repeat, 93784005);
        t.throws(function() { cron.scheduleCall(noop, 'x') }, /expected number/);
        t.done();
    },

    'should cancel a call': function(t) {
        var called = false;
        var job = cron.scheduleCall(function() { called = true }, 0, 10);
        cron.cancelCall(job);
        setTimeout(function() {
            t.ok(!called);
            t.done();
        }, 20);
    },

    'cancelCall should return the canceled calls': function(t) {
        t.deepEqual(cron.cancelCall(noop), []);

        var job1 = cron.scheduleCall(noop, offsetNow(10));
        t.deepEqual(cron.cancelCall(job1), [job1]);

        var job1 = cron.scheduleCall(noop, offsetNow(10));
        var job2 = cron.scheduleCall(noop, offsetNow(20));
        t.deepEqual(cron.cancelCall(noop), [job1, job2]);

        t.done();
    },

    'should run a call at the specified time and interval': function(t) {
        var callCount = 0;
        var job = cron.scheduleCall(function testCall() {
            t.equal(job.func, testCall);
            t.deepEqual(job.args, []);
            var now = Date.now();
            // allow for a possible off-by-one with nodejs setTimeout
            now += 1;
            t.ok(job._start <= now);
            t.ok(now % 30 < 5);
            if (++callCount === 5) {
                cron.cancelCall(job);
                t.done();
            }
        }, 0, 30);
        // _start is set to the call scheduled time
        t.ok(job._start > Date.now());
    },

    'should run a call only once': function(t) {
        var callCount = 0;
        var job = cron.scheduleCall(function() { callCount += 1 }, offsetNow(5));
        setTimeout(function() {
            t.equal(callCount, 1);
            t.deepEqual(cron.cancelCall(job), []);
            t.done();
        }, 17);
    },

    'should schedule a call for two days out': function(t) {
        var job = cron.scheduleCall(noop, 3 * 24 * 3600 * 1000 + 3600000, 100);
        t.ok(job._start > Date.now() + 48 * 3600 * 1000);
        t.equal(job._repeat, 100);
        t.done();
    },

    'should schedule a one-shot call for tomorrow if hour already passed': function(t) {
        var now = Date.now();
        var job = cron.scheduleCall(noop, offsetNow(-10));
        t.ok(job._start < Date.now() + Cron.msPerDay);
        t.ok(Date.now() + Cron.msPerDay < job._start + 20);
        t.done();
    },

    'setTimeout should invoke scheduleCall': function(t) {
        t.throws(function(){ cron.setTimeout() }, /not a function/);
        t.throws(function(){ cron.setTimeout(noop, "three") }, /expected number/);
        t.throws(function(){ cron.setTimeout(noop, 3, "four") }, /expected number/);
        cron.setTimeout(noop, 10, -1);

        var spy = t.spyOnce(cron, 'scheduleCall');
        cron.setTimeout(noop);
        t.ok(spy.called);
        var offset = Date.now() % Cron.msPerDay;
        t.contains(spy.args[0][0], { func: noop, repeat: 0 });
        t.ok(spy.args[0][0].at >= offset - 1);
        t.ok(spy.args[0][0].at < offset + 10);

        var spy = t.spyOnce(cron, 'scheduleCall');
        cron.setTimeout(noop, 10, -1);
        t.ok(spy.called);
        t.ok(spy.args[0][0].at > Date.now() % Cron.msPerDay);
        t.ok(spy.args[0][0].at < Date.now() % Cron.msPerDay + 20);
        t.equal(spy.args[0][0].func, noop);
        
        var spy = t.spyOnce(cron, 'scheduleCall');
        cron.setTimeout({ func: noop, at: 10, repeat: -1 });
        t.ok(spy.args[0][0].at > Date.now() % Cron.msPerDay);
        t.ok(spy.args[0][0].at < Date.now() % Cron.msPerDay + 20);
        t.equal(spy.args[0][0].func, noop);

        t.done();
    },

    'setTimeout should pass unknown at to scheduleCall': function(t) {
        t.throws(function() { cron.setTimeout(noop, /regex/) }, /not a number/);
        t.done();
    },

    'pause/resume': {
        'should pause a cronjob': function(t) {
            var now = Date.now();
            var tomorrow = now - (now % Cron.msPerDay) + Cron.msPerDay;
            var job = cron.scheduleCall(noop, 10);

            t.ok(job._timer);
            t.equal(job._start, tomorrow + 10); // scheduled for the expected time, 10ms past midnight GMT
            var start1 = job._start;

            job.pause();
            t.ok(!job._timer);                  // pause cancels the timer
            job.pause();                        // second pause is a no-op

            job.resume();
            t.ok(job._timer);                   // resume restarts the timer
            t.equal(job._start, start1);        // for the same scheduled time as before
            var timer1 = job._timer;
            job.resume();
            t.equal(job._timer, timer1);        // second resume is a no-op

            t.done();
        },
    },
}

function offsetNow( offset ) {
    return Date.now() % Cron.msPerDay + (offset || 0);
}

function noop() {}
