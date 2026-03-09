const sessions = {};

function getSession(userId) {

  if (!sessions[userId]) {

    sessions[userId] = {
      step: "start"
    };

  }

  return sessions[userId];
}

module.exports = {
  getSession
};
