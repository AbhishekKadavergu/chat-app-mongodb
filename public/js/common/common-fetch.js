const isUserValid = async (email, username, room) => {
    const response = await fetch(`/validateUser?email=${email}&username=${username}&room=${room}`);

    if (!response.ok) throw new Error(`An error has occured: ${response.status}`);

    const { isValid } = await response.json();

    return isValid;
};

const getActiveRooms = async () => {
    const response = await fetch('/getActiveRooms');

    if (!response.ok) throw new Error(`An error has occured: ${response.status}`);

    const { rooms } = await response.json();

    return rooms;
};

module.exports = {
    isUserValid,
    getActiveRooms,
};
