const getUserByEmailQuery = () => {
    return 'SELECT * FROM persona WHERE correo = $1';
  };
  
  const getUserByCedulaQuery = () => {
    return "SELECT * FROM persona WHERE numero_identificacion = '?'";
  };
  
  const insertUserQuery = () => {
    return `INSERT INTO persona (correo, usuario, contrasena) VALUES ($1, $2, $3)`;
  };
  
  const getUserPasswordByIdQuery = () => {
    return "SELECT contrasena FROM persona WHERE id = '$1'";
  };
  
  const updateUserPasswordQuery = () => {
    return "'UPDATE persona SET contrasena = $1 WHERE id = $2'";
  };
  
  module.exports = {
    getUserByEmailQuery,
    getUserByCedulaQuery,
    insertUserQuery,
    getUserPasswordByIdQuery,
    updateUserPasswordQuery,
  };
  