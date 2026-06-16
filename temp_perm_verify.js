const baseUrl = 'http://127.0.0.1:5000';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const suffix = Date.now();
  const adminUsername = `adminperm${suffix}`;
  const adminEmail = `${adminUsername}@example.com`;
  const adminPassword = 'Password123!';

  const userUsername = `userperm${suffix}`;
  const userEmail = `${userUsername}@example.com`;
  const userPassword = 'Password123!';

  const adminRegister = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Permission Admin',
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      role: 'ADMIN'
    })
  });

  const adminRegisterBody = await adminRegister.json();
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: adminUsername, password: adminPassword })
  });
  const adminLoginBody = await adminLogin.json();

  const userRegister = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Permission User',
      email: userEmail,
      username: userUsername,
      password: userPassword,
      role: 'USER'
    })
  });

  const userRegisterBody = await userRegister.json();
  const userLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: userUsername, password: userPassword })
  });
  const userLoginBody = await userLogin.json();

  const userPermissions = await fetch(`${baseUrl}/api/auth/permissions`, {
    headers: { Authorization: `Bearer ${userLoginBody.token}` }
  });
  const userPermissionsBody = await userPermissions.json();

  const usersList = await fetch(`${baseUrl}/api/users`, {
    headers: { Authorization: `Bearer ${adminLoginBody.token}` }
  });
  const usersListBody = await usersList.json();

  const forbiddenUsersList = await fetch(`${baseUrl}/api/users`, {
    headers: { Authorization: `Bearer ${userLoginBody.token}` }
  });
  const forbiddenUsersListBody = await forbiddenUsersList.json();

  const changePassword = await fetch(`${baseUrl}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userLoginBody.token}`
    },
    body: JSON.stringify({ currentPassword: userPassword, newPassword: 'NewPassword123!' })
  });
  const changePasswordBody = await changePassword.json();

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userLoginBody.token}` }
  });
  const logoutBody = await logout.json();

  const staleCustomerCheck = await fetch(`${baseUrl}/api/customers`, {
    headers: { Authorization: `Bearer ${userLoginBody.token}` }
  });
  const staleCustomerCheckBody = await staleCustomerCheck.json();

  console.log(JSON.stringify({
    adminRegisterStatus: adminRegister.status,
    adminRegisterBody,
    adminLoginStatus: adminLogin.status,
    userRegisterStatus: userRegister.status,
    userRegisterBody,
    userLoginStatus: userLogin.status,
    userPermissionsStatus: userPermissions.status,
    userPermissionsBody,
    usersListStatus: usersList.status,
    usersListBody,
    forbiddenUsersListStatus: forbiddenUsersList.status,
    forbiddenUsersListBody,
    changePasswordStatus: changePassword.status,
    changePasswordBody,
    logoutStatus: logout.status,
    logoutBody,
    staleCustomerCheckStatus: staleCustomerCheck.status,
    staleCustomerCheckBody
  }, null, 2));
})();
