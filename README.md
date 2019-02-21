js-cron
=======
[![Build Status](https://api.travis-ci.org/andrasq/node-js-cron.svg?branch=master)](https://travis-ci.org/andrasq/node-js-cron?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/andrasq/node-js-cron/badge.svg?branch=master)](https://coveralls.io/github/andrasq/node-js-cron?branch=master)

Very simple little javascript call scheduler.

It arranges for calls to be made repeatedly on a schedule, optionally passing in call
arguments, but does not parse crontab syntax.  Errors are not caught.

    jscron = require('js-cron');
    // call every hour at 15 past the hour
    jscron.scheduleCall(myFunction, 15*60*1000, 24*60*1000);


API
---

### job = jscron.scheduleCall( func, at [,interval] )

Call function at "at" milliseconds past midnight GMT then every "interval" milliseconds
thereafter.  To run only once, specify an "interval" that is not a number greater than zero.
Each subsequent call is scheduled after the function returns, to not overlap calls.  If
"interval" is not a positive number the call will run only once, else it will run every
"interval" seconds.  Returns an opaque "job" object that can be used to cancel the call.
The contents of the job object are internal to the module, and may change.

To pass call arguments or an object instance to a method call, use the `options` form of the
call; see below.

    jscron = require('js-cron');
    console.log("started at", new Date().getTime());
    job = jscron.scheduleCall(function() { console.log("running at", new Date().getTime()) }, 20, 1000);
    // => "started at 1550721147755"
    //    "running at 1550721148021"
    //    "running at 1550721149021"
    //    ...

### job = jscron.scheduleCall( options )

As above, but the call can also be scheduled with an options object containing fields:

- func - the function to call, required.
- at - milliseconds past midnight of the call, required.
- repeat - milliseconds between calls, required.  Use <= 0 to call only once.
- self - value of `this` when invoking the function, default null.
- args - array containing arguments to pass to the function, default [].
  If not an array an error is thrown.

No timezone handling, all times are relative to GMT.

### jobs = jscron.cancelCall( jobOrFunction )

Cancel the scheduled call identified by "job" or by the actual function that was used.
Returns an array containing the "job" objects that were canceled.  If jobOrFunction is the
special string '_all' then all scheduled jobs will be canceled, both one-shot and recurring;
this is intended mostly for testing.

    job = jscron.scheduleCall(myFunction, myStartOffset, myInterval);
    job1 = jscron.scheduleCall(myFunction, myStartOffset, myInterval);
    jscron.cancelCall(job1);
    // => [job1]

    job2 = jscron.scheduleCall(myOtherFunction, myStartOffset);
    job3 = jscron.scheduleCall(myOtherFunction, myOtherStartOffset);
    jscron.cancelCall(myOtherFunction);
    // => [job2, job3]

### job = jscron.setTimeout( funcOrOptions, [,at [,interval]] )

Same as `scheduleCall` but starting relative to now, not midnight GMT.  Call "func"
"at" milliseconds from now (else as soon as possible), then every "interval" milliseconds
thereafter (else just once).  This just computes the appropriate time offset and calls
`scheduleCall`.

Takes the same arguments as schedule call, either a function with optional at and
interval, or an options object, but unlike for scheduleCall, here "at" is optional and
default to now.


Changelog
---------

- 0.9.0 - first release
