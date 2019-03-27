qcron
=======
[![Build Status](https://api.travis-ci.org/andrasq/node-qcron.svg?branch=master)](https://travis-ci.org/andrasq/node-qcron?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/andrasq/node-qcron/badge.svg?branch=master)](https://coveralls.io/github/andrasq/node-qcron?branch=master)

Simple little javascript call scheduler.

It arranges for calls to be made repeatedly on a schedule, optionally passing in call
arguments, but does not parse crontab syntax.  Errors are not caught.

    qcron = require('qcron');
    // call every hour at 15 past the hour
    qcron.scheduleCall(myFunction, '15m', '1h');


API
---

### job = qcron.scheduleCall( func, at [,interval] )

Call function at "at" milliseconds past midnight GMT then every "interval" milliseconds
thereafter.  To run only once, specify an "interval" that is not a number greater than zero.
Each subsequent call is scheduled after the function returns, to not overlap calls.  If
"interval" is not a positive number the call will run only once, else it will run every
"interval" seconds.  Returns an opaque "job" object that can be used to cancel the call.
The contents of the job object are internal to the module, and may change.

"At" and "interval" can be specified with units, as eg "2h 15m" for two hours and fifteen
minutes.  The units must be one of 'd', 'h', 'm', or 's': days, hours, minutes, seconds.
Numbers can be integers or simple decimals with a decimal point, (eg "1.5h" 90 minutes).
Numbers without units are milliseconds, i.e. "1s 500" is 1500 ms.

Jobs scheduled for a time offset not less than the milliseconds since 1/1/70 GMT will
be scheduled to launch at the specified absolute runtime.  As a convenience, the special
keyword `now` is recognized in timespecs as meaning the current datetime.  `now` is
additive like the other time formats, so "now 20s" is 20 seconds from now.

To pass call arguments or an object instance to a method call, use the `options` form of the
call; see below.

    qcron = require('qcron');
    console.log("started at", new Date().getTime());
    job = qcron.scheduleCall(function() { console.log("running at", new Date().getTime()) }, 20, 1000);
    // => "started at 1550721147755"
    //    "running at 1550721148021"
    //    "running at 1550721149021"
    //    ...

### job = qcron.scheduleCall( options )

As above, but the call can also be scheduled with an options object containing fields:

- func - the function to call, required.
- at - milliseconds past midnight of the call, required.
- repeat - milliseconds between calls, default 0.  Use <= 0 to call only once.
- self - value of `this` when invoking the function, default null.
- args - array containing arguments to pass to the function, default [].
  If set but not an array an error is thrown.

No timezone handling, all times are relative to GMT.

### jobs = qcron.cancelCall( jobOrFunction )

Cancel the scheduled call identified by "job" or by the actual function that was used.
Returns an array containing the "job" objects that were canceled.  If jobOrFunction is the
special string '_all' then all scheduled jobs will be canceled, both one-shot and recurring;
this is intended mostly for testing.

    job = qcron.scheduleCall(myFunction, myStartOffset, myInterval);
    job1 = qcron.scheduleCall(myFunction, myStartOffset, myInterval);
    qcron.cancelCall(job1);
    // => [job1]

    job2 = qcron.scheduleCall(myOtherFunction, myStartOffset);
    job3 = qcron.scheduleCall(myOtherFunction, myOtherStartOffset);
    qcron.cancelCall(myOtherFunction);
    // => [job2, job3]

### job = qcron.setTimeout( funcOrOptions, [,at [,interval]] )

Same as `scheduleCall` but starting relative to now, not midnight GMT.  Calls "func"
"at" milliseconds from now (else as soon as possible), then every "interval" milliseconds
thereafter (else just once).  This just computes the appropriate time offset and calls
`scheduleCall`.

Takes the same arguments as schedule call, either a function with optional at and
interval, or an options object, but unlike for scheduleCall, here "at" is optional and
defaults to immediately.

### Cronjob

The returned cronjob object has some properties of note

#### job._start

Last scheduled start time, in milliseconds.  This may be in the past for paused or currently
running jobs, but is in the future for waiting jobs.

#### job._timer

The timer for the next run of the job, or `null` if the job has been paused.

#### job.pause( )

Cancel the pending job timer and clear the job._timer field.
If already canceled has no effect.

#### job.resume( )

Reschedule the job for the next runtime.  If not currently paused has no effect.

Note that resume of run-once jobs whose execution time elapsed while paused reschedules them
for the same time the following day instead of letting them expire unrun.


Changelog
---------

- 0.5.0 - accept 'now' as a time spec, eg `at: 'now 10s'`
- 0.4.0 - job pause/resume methods, fix timespec units in options object
- 0.3.0 - allow units in timespec eg '2h 15m'
- 0.2.0 - first release
