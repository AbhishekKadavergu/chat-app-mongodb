/* eslint-disable jest/no-conditional-expect */
/* eslint-disable jest/no-done-callback */
const io = require('socket.io-client');
const server = require('../../app');
const mongoose = require('mongoose');

const { configureDb } = require('./fixtures/db');
const RoomModel = require('../../models/room');
const UserModel = require('../../models/user');
// require('log-timestamp');

let socketA;
let socketB;
let socketC;

const createSocket = () => {
    return new Promise((resolve, reject) => {
        // create socket
        const socket = io('http://localhost', {
            reconnection: false,
            forceNew: true,
            transports: ['websocket'],
        });

        // define event handler for sucessfull connection
        socket.on('connect', () => {
            resolve(socket);
        });

        // if connection takes longer than 5 seconds throw error
        setTimeout(() => {
            reject(new Error('Failed to connect within 5 seconds.'));
        }, 5000);
    });
};

const disconnectSocket = (socket) => {
    return new Promise((resolve, reject) => {
        if (socket.connected) {
            socket.disconnect();
            resolve(true);
        } else {
            resolve(false);
        }
    });
};

jest.setTimeout(20000);

beforeAll((done) => {
    server.listen(80, () => {
        done();
    });
});

afterAll(async (done) => {
    await mongoose.connection.close();

    server.close(() => {
        done();
    });
});

beforeEach(async () => {
    await configureDb();

    socketA = await createSocket();
    socketB = await createSocket();
    socketC = await createSocket();
});

afterEach(async (done) => {
    await disconnectSocket(socketA);
    await disconnectSocket(socketB);
    await disconnectSocket(socketC);

    // 1sec delay to let disconnection to finish
    await new Promise((res) => setTimeout(res, 1000));

    done();
});

describe('integration tests for app - sockets and db', () => {
    describe('server connection', () => {
        test('socket should be able to connect to io server', (done) => {
            expect(socketA.connected).toBe(true);
            expect(socketB.connected).toBe(true);
            expect(socketC.connected).toBe(true);

            done();
        });
    });

    describe('create room', () => {
        test('if room is not yet existing, it should created and saved to db', async (done) => {
            // note: room will be automatically created once a user joins in
            const testUser = { email: 'catherine.par@gmail.com', username: 'catherine', room: 'node.js' };

            const testUserRoom = await RoomModel.findOne({ name: testUser.room });

            // room is not existing
            expect(testUserRoom).toBeNull();

            socketA.emit('join', testUser, async (callback) => {
                expect(callback).toBeUndefined();

                const room = await RoomModel.findOne({ name: testUser.room });

                // room has been created
                expect(room).not.toBeNull();

                done();
            });
        });

        test('if room is existing, it should used instead of creating a duplicate', async (done) => {
            // note: room will be automatically created once a user joins in
            const testUser = { email: 'catherine.par@gmail.com', username: 'catherine', room: 'javascript' };

            const testUserRoom = await RoomModel.findOne({ name: testUser.room });

            // room is already existing
            expect(testUserRoom).not.toBeNull();

            socketA.emit('join', testUser, async (callback) => {
                expect(callback).toBeUndefined();

                const room = await RoomModel.findOne({ name: testUser.room });

                expect(room._id).toStrictEqual(testUserRoom._id);

                done();
            });
        });
    });

    describe('join room', () => {
        describe('success', () => {
            test('if email and username are unique (in specific room), user should be saved to db', (done) => {
                const testUser = { email: 'catherine.par@gmail.com', username: 'catherine', room: 'javascript' };

                socketA.emit('join', testUser, async (callback) => {
                    expect(callback).toBeUndefined();

                    const user = await UserModel.findOne({ sessionId: socketA.id });

                    expect(user).not.toBeNull();
                    expect(user.chatroom.name).toBe(testUser.room);

                    done();
                });
            });

            test('if multiple unique users (in specific room), all should be saved to db', (done) => {
                const testUser1 = { email: 'user1@gmail.com', username: 'user1', room: 'test' };
                const testUser2 = { email: 'user2@gmail.com', username: 'user2', room: 'test' };

                socketA.emit('join', testUser1, () => {});

                socketB.emit('join', testUser2, async (callback) => {
                    expect(callback).toBeUndefined();

                    const room = await RoomModel.findOne({ name: 'test' });

                    expect(room.users).toHaveLength(2);

                    done();
                });
            });

            test('if previous session disconnects and then same credentials are used again, user should be saved to db', async (done) => {
                const testUser = { email: 'user2@gmail.com', username: 'user2', room: 'css' };

                socketA.emit('join', testUser, async (callback) => {
                    expect(callback).toBeUndefined();

                    socketA.disconnect();

                    expect(socketA.connected).toBe(false);
                });

                await new Promise((res) => setTimeout(res, 300));

                socketB.emit('join', testUser, async (callback) => {
                    expect(callback).toBeUndefined();

                    const user = await UserModel.findOne({ sessionId: socketB.id });

                    expect(user).not.toBeNull();
                    expect(user.chatroom.name).toBe(testUser.room);

                    done();
                });
            });
        });
    });

    describe('failure', () => {
        test('if email is already in use, user should NOT be saved to db', (done) => {
            const testUser = { email: 'kaye.cenizal@gmail.com', username: 'catherine', room: 'javascript' };

            socketA.emit('join', testUser, async () => {
                const room = await RoomModel.findOne({ name: testUser.room });
                const user = room.users.find((user) => user.email === testUser.email);

                expect(user.sessionId).not.toBe(socketA.id);

                done();
            });
        });

        test('if username is already in use, user should NOT be saved to db', (done) => {
            const testUser = { email: 'kaye.cenizal@live.com', username: 'kaye', room: 'javascript' };

            socketA.emit('join', testUser, async () => {
                const room = await RoomModel.findOne({ name: testUser.room });
                const user = room.users.find((user) => user.username === testUser.username);

                expect(user.sessionId).not.toBe(socketA.id);

                done();
            });
        });

        test('if both email and username are already in use, user should NOT be saved to db', async (done) => {
            const testUser = { email: 'user1@gmail.com', username: 'user1', room: 'html' };

            socketA.emit('join', testUser, (callback) => {
                expect(callback).toBeUndefined();
            });

            await new Promise((res) => setTimeout(res, 100));

            socketB.emit('join', testUser, async () => {
                const room = await RoomModel.findOne({ name: testUser.room });
                const user = room.users.find((user) => user.email === testUser.email);

                expect(user.sessionId).not.toBe(socketB.id);

                done();
            });
        });

        test('if email is invalid, user should NOT be saved to db', (done) => {
            const testUser = { email: 'kaye.cenizal!live.com', username: 'kaye.cenizal', room: 'javascript' };

            socketA.emit('join', testUser, async () => {
                const room = await RoomModel.findOne({ name: testUser.room });

                const user = room.users.find((user) => user.email === testUser.email);

                expect(user).toBeUndefined();

                done();
            });
        });
    });

    describe('chatroom messages', () => {
        test('sent message should be saved to db', async (done) => {
            const testUser = { email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'css' };

            socketA.emit('join', testUser, (callback) => {
                expect(callback).toBeUndefined();
            });

            await new Promise((res) => setTimeout(res, 300));

            socketA.emit('sendMessage', `Hello!`, async () => {
                const room = await RoomModel.findOne({ name: testUser.room });
                const allMessages = await room.getMessages();

                // get only messages from testUser
                const userMessages = allMessages.reduce((text, message) => {
                    if (message.sender.email === testUser.email) {
                        text.push(message.text);
                    }

                    return text;
                }, []);

                expect(userMessages).toEqual(expect.arrayContaining(['Hello!']));

                done();
            });
        });

        test('if message has profanity, it should NOT be saved to db', (done) => {
            const testUser = { email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'css' };

            socketA.emit('join', testUser, (callback) => {
                expect(callback).toBeUndefined();
            });

            socketA.emit('sendMessage', 'damn', async () => {
                const room = await RoomModel.findOne({ name: testUser.room });
                const allMessages = await room.getMessages();

                expect(allMessages).toHaveLength(0);

                done();
            });
        });
    });

    describe('activeRoomsUpdate event', () => {
        test(`if user joins, the room should be added to active rooms list`, async (done) => {
            const testUser1 = { email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'css' };
            const testUser2 = { email: 'callie.par@gmail.com', username: 'callie', room: 'python' };

            socketA.emit('join', testUser1, async (callback) => {
                expect(callback).toBeUndefined();

                const activeRooms = await RoomModel.getActiveRooms();

                expect(activeRooms).toStrictEqual(['javascript', 'css', 'html']);
            });

            await new Promise((res) => setTimeout(res, 300));

            socketB.emit('join', testUser2, async (callback) => {
                expect(callback).toBeUndefined();

                const activeRooms = await RoomModel.getActiveRooms();

                expect(activeRooms).toStrictEqual(['javascript', 'css', 'html', 'python']);

                done();
            });
        });
    });

    // todo: create room should be added to socket test
    // todo: if room has no users and no messages...should be deleted (on disconnect)
    // todo: if room has existing user ... should not be deleted
    // todo: if room has saved messages ....should not be deleted
});
