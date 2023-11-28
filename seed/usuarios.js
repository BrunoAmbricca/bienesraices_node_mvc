import bcrypt from 'bcrypt'

const usuarios = [
    {
        nombre: 'Bruno',
        email: 'bruno@bruno.com',
        confirmado: 1,
        password: bcrypt.hashSync('password', 10)
    }
]

export default usuarios;