const RoomModel = require('../../../../models/room');
const room_controller = require('../../../../controller/room-controller');
const CustomError = require('../../../../error/CustomError');
jest.mock('../../../../error/CustomError');

const mockRequest = (queryData) => ({
    query: queryData,
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);

    return res;
};

const mockNext = () => {
    const next = jest.fn();
    return next;
};

afterEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.resetAllMocks();
});

describe('unit tests for rooms-controller', () => {
    describe('/validateUser route', () => {
        let getChatRoomMock;
        let processValidationResultsMock;

        beforeEach(() => {
            getChatRoomMock = jest.spyOn(room_controller, 'getChatRoom');
            processValidationResultsMock = jest.spyOn(room_controller, 'processValidationResults');
        });

        describe('invalid responses', () => {
            test('if room parameter is missing, should call error middleware (with 400 status)', async () => {
                processValidationResultsMock.mockImplementationOnce(() => {
                    throw new CustomError('Invalid request', 'Missing input', 400);
                });

                const req = mockRequest({ email: 'kaye.cenizal@gmail.com', username: 'kaye' });
                const res = mockResponse();
                const next = mockNext();

                await room_controller.validateUser(req, res, next);

                expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
                expect(getChatRoomMock).not.toHaveBeenCalled();
            });

            test('if email parameter is missing, should call error middleware (with 400 status)', async () => {
                processValidationResultsMock.mockImplementationOnce(() => {
                    throw new CustomError('Invalid request', 'Missing input', 400);
                });

                const req = mockRequest({ username: 'kaye', room: 'javascript' });
                const res = mockResponse();
                const next = mockNext();

                await room_controller.validateUser(req, res, next);

                expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
                expect(getChatRoomMock).not.toHaveBeenCalled();
            });

            test('if username parameter is missing, should call error middleware (with 400 status)', async () => {
                processValidationResultsMock.mockImplementationOnce(() => {
                    throw new CustomError('Invalid request', 'Missing input', 400);
                });

                const req = mockRequest({ email: 'kaye.cenizal@gmail.com', room: 'javascript' });
                const res = mockResponse();
                const next = mockNext();

                await room_controller.validateUser(req, res, next);

                expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
                expect(getChatRoomMock).not.toHaveBeenCalled();
            });

            test('if email is invalid, should call error middleware (with 400 status)', async () => {
                processValidationResultsMock.mockImplementationOnce(() => {
                    throw new CustomError('Invalid request', 'Invalid email', 400);
                });

                const req = mockRequest({ email: 'kaye.cenizal!gmail.com', username: 'kaye', room: 'javascript' });
                const res = mockResponse();
                const next = mockNext();

                await room_controller.validateUser(req, res, next);

                expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
                expect(getChatRoomMock).not.toHaveBeenCalled();
            });

            test('if any other issue is encountered, should call error middleware (with 500 status)', async () => {
                processValidationResultsMock.mockImplementationOnce(() => {
                    return;
                });

                const req = mockRequest({ email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'javascript' });
                const res = mockResponse();
                const next = mockNext();

                const getChatRoomMock = jest.spyOn(room_controller, 'getChatRoom');
                getChatRoomMock.mockImplementationOnce(() => {
                    throw new Error('Mock Error');
                });

                await room_controller.validateUser(req, res, next);

                expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
                expect(getChatRoomMock).toHaveBeenCalled();
            });
        });

        let checkUserAccessMock;

        describe('valid responses', () => {
            beforeEach(() => {
                checkUserAccessMock = jest.spyOn(room_controller, 'checkUserAccess');
                processValidationResultsMock.mockImplementationOnce(() => {
                    return;
                });
            });

            describe('non existing room', () => {
                test('if credentials are valid, user should be allowed to join in', async () => {
                    getChatRoomMock.mockReturnValue(null);

                    const testResult = {
                        result: { isAllowed: true, duplicateFields: [] },
                    };

                    const req = mockRequest({ email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'javascript' });
                    const res = mockResponse();
                    const next = mockNext();

                    await room_controller.validateUser(req, res, next);

                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.send).toHaveBeenCalledWith(testResult);
                    expect(getChatRoomMock).toHaveBeenCalled();
                });
            });

            describe('existing room', () => {
                test('if credentials are valid, user should be allowed to join in', async () => {
                    getChatRoomMock.mockReturnValue({ _id: '6043163766eb61058c06d3f2', name: 'javascript', __v: 0 });
                    checkUserAccessMock.mockReturnValue({ isAllowed: true, duplicateFields: [] });

                    const testResult = {
                        result: { isAllowed: true, duplicateFields: [] },
                    };

                    const req = mockRequest({ email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'javascript' });
                    const res = mockResponse();
                    const next = mockNext();

                    await room_controller.validateUser(req, res, next);

                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.send).toHaveBeenCalledWith(testResult);
                    expect(getChatRoomMock).toHaveBeenCalled();
                    expect(checkUserAccessMock).toHaveBeenCalled();
                });

                test(`if email already in use, user should NOT be allowed to join in`, async () => {
                    getChatRoomMock.mockReturnValue({ _id: '6043163766eb61058c06d3f2', name: 'javascript', __v: 0 });
                    checkUserAccessMock.mockReturnValue({ isAllowed: false, duplicateFields: ['email'] });

                    const testResult = {
                        result: { isAllowed: false, duplicateFields: ['email'] },
                    };

                    const req = mockRequest({ email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'javascript' });
                    const res = mockResponse();
                    const next = mockNext();

                    await room_controller.validateUser(req, res, next);

                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.send).toHaveBeenCalledWith(testResult);
                    expect(getChatRoomMock).toHaveBeenCalled();
                    expect(checkUserAccessMock).toHaveBeenCalled();
                });

                test(`if username already in use, user should NOT be allowed to join in`, async () => {
                    getChatRoomMock.mockReturnValue({ _id: '6043163766eb61058c06d3f2', name: 'javascript', __v: 0 });
                    checkUserAccessMock.mockReturnValue({ isAllowed: false, duplicateFields: ['username'] });

                    const testResult = {
                        result: { isAllowed: false, duplicateFields: ['username'] },
                    };

                    const req = mockRequest({ email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'javascript' });
                    const res = mockResponse();
                    const next = mockNext();

                    await room_controller.validateUser(req, res, next);

                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.send).toHaveBeenCalledWith(testResult);
                    expect(getChatRoomMock).toHaveBeenCalled();
                    expect(checkUserAccessMock).toHaveBeenCalled();
                });

                test(`if both email and username are in use, user should NOT be allowed to join in`, async () => {
                    getChatRoomMock.mockReturnValue({ _id: '6043163766eb61058c06d3f2', name: 'javascript', __v: 0 });
                    checkUserAccessMock.mockReturnValue({ isAllowed: false, duplicateFields: ['email', 'username'] });

                    const testResult = {
                        result: { isAllowed: false, duplicateFields: ['email', 'username'] },
                    };

                    const req = mockRequest({ email: 'kaye.cenizal@gmail.com', username: 'kaye', room: 'javascript' });
                    const res = mockResponse();
                    const next = mockNext();

                    await room_controller.validateUser(req, res, next);

                    expect(res.status).toHaveBeenCalledWith(200);
                    expect(res.send).toHaveBeenCalledWith(testResult);
                    expect(getChatRoomMock).toHaveBeenCalled();
                    expect(checkUserAccessMock).toHaveBeenCalled();
                });
            });
        });
    });

    describe('/getActiveRooms route', () => {
        let getActiveRoomsMock;

        beforeEach(() => {
            getActiveRoomsMock = jest.spyOn(RoomModel, 'getActiveRooms');
        });

        describe('invalid responses', () => {
            test('if error is encountered, should call error middleware', async () => {
                getActiveRoomsMock.mockImplementationOnce(() => {
                    throw new Error('Something went wrong');
                });

                const req = mockRequest();
                const res = mockResponse();
                const next = mockNext();

                await room_controller.getActiveRooms(req, res, next);

                expect(getActiveRoomsMock).toHaveBeenCalled();
                expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Something went wrong' }));
            });
        });

        describe('valid responses', () => {
            test(`if there are no active rooms, should return empty array`, async () => {
                getActiveRoomsMock.mockReturnValue([]);

                const testRooms = { rooms: [] };

                const req = mockRequest();
                const res = mockResponse();
                const next = mockNext();

                await room_controller.getActiveRooms(req, res, next);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(testRooms);
                expect(getActiveRoomsMock).toHaveBeenCalled();
            });

            test(`if there are active rooms, should return array of room names`, async () => {
                getActiveRoomsMock.mockReturnValue(['javascript', 'python']);

                const testRooms = { rooms: ['javascript', 'python'] };

                const req = mockRequest();
                const res = mockResponse();
                const next = mockNext();

                await room_controller.getActiveRooms(req, res, next);

                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(testRooms);
                expect(getActiveRoomsMock).toHaveBeenCalled();
            });
        });
    });
});
