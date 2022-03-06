require('dotenv').config();
const test = require('ava');
const config = require('./config');
const Ditto = require('../dist/src');

for(const type in config) {
  const url = 'test-for-ditto';
  const commentModel = new Ditto(type)('Comment', config[type]);

  test(type, async t => {
    const exampleData = {
      nick: 'Michael',
      mail: 'michael@test.com',
      link: '',
      ua: 'ava',
      url,
      pid: undefined,
      rid: undefined,
      comment: 'Hello from ava test',
      ip: '127.0.0.1',
      insertedAt: new Date()
    }
    const parentComment = await commentModel.add(exampleData);
    const childExampleData = {
      ...exampleData,
      nick: 'Jack',
      mail: 'jack@test.com',
      comment: 'Welcome to ava test!',
      ip: '255.255.255.255',
      insertedAt: new Date(),
      pid: parentComment.id,
      rid: parentComment.id
    };
    const childComment = await commentModel.add(childExampleData);

    //select 
    const comments = await commentModel.select({url});
    t.deepEqual(comments.length, 2);

    const parentComments = await commentModel.select({id: childComment.id});
    const subComments = await commentModel.select({rid: parentComment.id});
    t.deepEqual(subComments.length, 1);
    t.deepEqual(parentComments, subComments);

    await commentModel.delete({url});
  });
}