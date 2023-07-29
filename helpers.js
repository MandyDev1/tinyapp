// Helper function to check if email already exists in users object
const getUserByEmail = (email, database) => {
  for (const userId in database) {
    if (database[userId].email === email) {
      return database[userId];
    }
  }
  return undefined;
};

module.exports = { getUserByEmail };