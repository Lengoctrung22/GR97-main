const historyByUser = new Map();
let counter = 1;

const getOrCreateHistory = (userId) => {
  if (!historyByUser.has(userId)) {
    historyByUser.set(userId, []);
  }
  return historyByUser.get(userId);
};

export const getChatHistory = (userId) => [...getOrCreateHistory(userId)];

export const getRecentChatHistory = (userId, limit = 10) =>
  getOrCreateHistory(userId)
    .slice(-limit)
    .map((item) => ({ role: item.role, content: item.content }));

export const addChatMessage = (userId, role, content) => {
  const history = getOrCreateHistory(userId);
  const message = {
    _id: `chat_${counter++}`,
    user: userId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  history.push(message);
  return message;
};

export const clearChatHistory = (userId) => {
  historyByUser.set(userId, []);
};
