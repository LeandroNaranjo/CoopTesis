// Utilidades
function separarNombreCompleto(nombreUnido) {
    if (!nombreUnido) {
        return {
            apellido1: '',
            apellido2: '',
            nombres: ''
        };
    }

    const partes = nombreUnido.trim().split(' ');

    const apellido1 = partes.length > 0 ? partes[0] : '';
    const apellido2 = partes.length > 1 ? partes[1] : '';
    const nombres = partes.slice(2).join(' ') || '';

    return {
        apellido1,
        apellido2,
        nombres
    };
}

function crearNombreUsuario(identificacion) {
    if (!identificacion) {
        throw new Error('La identificación no puede estar vacía');
    }
    return identificacion.trim().toLowerCase().replace(/\s+/g, '');
}

module.exports = {
    separarNombreCompleto,
    crearNombreUsuario,
};
