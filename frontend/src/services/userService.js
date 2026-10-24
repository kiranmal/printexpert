export const getUser = () => {
  const user = localStorage.getItem("currentUser");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch (error) {
    return null;
  }
};

export const updateUser = (userData) => {
  const oldUser = getUser();

  const updatedUser = {
    ...oldUser,
    ...userData,
  };

  localStorage.setItem(
    "currentUser",
    JSON.stringify(updatedUser)
  );

  return updatedUser;
};

export const removeUser = () => {
  localStorage.removeItem("currentUser");
};