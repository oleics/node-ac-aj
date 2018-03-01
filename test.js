
var assert = require('assert');

var Aj = require('./aj.js');

var aj = new Aj();

// set some actions
aj
  .set(actionAll, 'foo')
  .set(action1, [
    ['foo', '1'],
    ['foo', '1', '1'],
    ['bar', '1'],
  ])
  .set(action2, [
    'foo:2',
    'bar:2',
  ])
  .set(action3, [
    'foo:3',
    'bar:3',
  ])
;

// list all actions
console.log('Available Actions:', aj.availableActions());

// listen
aj.onAny(function(event, data) {
  console.log('%j %j', event, data);
});

// run some actions on some data
Promise.resolve({
  data: {
    foo: 'bar',
    seenBy: [],
  },
  batch: [
    'baz',
    ['baz','buz'],
    'foo',
    'foo:1',
    'foo:1:1',
    'foo:2',
    'bar:2',
    'foo:3',
    'bar:3',
    'bar:3',
    'foo:3',
    'baz',
  ],
})
  .then(function(context){
    console.log('Batch');
    console.log(context.batch);
    console.log('Runing...');
    return aj(context.batch, context.data).then(function(data){
      context.nextData = data;
      return context;
    });
  })
  .then(function(context){
    console.log('Result');
    console.log(context.data);

    assert(context.nextData === context.data);
    assert.strictEqual(context.data.foo, 'bar');
    assert.deepEqual(context.data.seenBy, [ '', '1', '1', '2', '2', '3', '3', '3', '3' ]);

    console.log('OK');
    process.exit(0);
  })
  .catch(function(err){
    console.error(err.stack||err);
    process.exit(1);
  })
;

function actionAll(data) {
  data.seenBy.push('');
}

function action1(data) {
  data.seenBy.push('1');
}

function action2(data) {
  data.seenBy.push('2');
}

function action3(data) {
  data.seenBy.push('3');
}
