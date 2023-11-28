import {body, check, validationResult} from 'express-validator'
import bcrypt from 'bcrypt'
import Usuario from '../models/Usuario.js'
import { generarId, generarJWT } from '../helpers/tokens.js';
import { emailOlvidePassword, emailRegistro } from '../helpers/emails.js';

const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina: 'Iniciar Sesion',
        csrfToken: req.csrfToken()
    });
};

const autenticar = async (req, res) => {
    const {email, password} = req.body

    //Validacion
    await check('email').isEmail().withMessage('El Email es obligatorio').run(req)
    await check('password').notEmpty().withMessage('El Password es obligatorio').run(req)
    //await check('repetir_password').equals('password').withMessage('Las passwords no son iguales').run(req)

    let resultado = validationResult(req)

    if(!resultado.isEmpty()){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesion',
            errores: resultado.array(),
            csrfToken: req.csrfToken()
        });
    }

    const usuario = await Usuario.findOne({where: {email}})

    if(!usuario){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesion',
            errores: [{msg: 'El usuario no existe'}],
            csrfToken: req.csrfToken()
        });
    }

    if(!usuario.confirmado){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesion',
            errores: [{msg: 'La cuenta no esta confirmada'}],
            csrfToken: req.csrfToken()
        });
    }

    if(!usuario.verificarPassword(password)){
        return res.render('auth/login', {
            pagina: 'Iniciar Sesion',
            errores: [{msg: 'El password es incorrecto'}],
            csrfToken: req.csrfToken()
        });
    }

    const token = generarJWT({id: usuario.id, nombre: usuario.nombre})

    return res.cookie('_token', token, {
        httpOnly: true,
        //secure: true
    }).redirect('/mis-propiedades')
};

const cerrarSesion = (req, res) => {
    return res.clearCookie('_token').status(200).redirect('/auth/login')
}

const formularioRegistro = (req, res) => {
    res.render('auth/registro', {
        pagina: 'Crear Cuenta',
        csrfToken: req.csrfToken()
    });
};

const registrar = async (req, res) => {
    const {nombre, email, password} = req.body

    //Validacion
    await check('nombre').notEmpty().withMessage('El nombre no puede estar vacio').run(req)
    await check('email').isEmail().withMessage('Eso no parece un email').run(req)
    await check('password').isLength({min: 6}).withMessage('La password contener al menos 6 caracteres').run(req)
    //await check('repetir_password').equals('password').withMessage('Las passwords no son iguales').run(req)

    let resultado = validationResult(req)

    const existeUsuario = await Usuario.findOne({where: {email}})

    if(existeUsuario){
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            errores: [{msg: 'Ya existe una cuenta con ese Email'}],
            usuario:{
                nombre,
                email
            },
            csrfToken: req.csrfToken()
        });
    }

    if(!resultado.isEmpty()){
        return res.render('auth/registro', {
            pagina: 'Crear Cuenta',
            errores: resultado.array(),
            usuario:{
                nombre,
                email
            },
            csrfToken: req.csrfToken()
        });
    }

    const usuario = await Usuario.create({nombre, email, password, token: generarId()})

    res.render('templates/mensaje', {
        pagina: 'Cuenta creada Correctamente!',
        mensaje: 'Hemos enviado un Email de confirmacion, presiona en el enlace.'
    });

    emailRegistro({
        nombre: usuario.nombre,
        email: usuario.email,
        token: usuario.token
    });
};

const confirmar = async (req, res) => {
    const {token} = req.params;

    const usuario = await Usuario.findOne({where: {token}})

    if(!usuario){
        res.render('auth/confirmar-cuenta', {
            pagina: 'Error al confirmar tu cuenta.',
            mensaje: 'Hubo un error al confirmar tu cuenta, intenta de nuevo.',
            error: true
        });
    }

    usuario.token = null
    usuario.confirmado = true
    await usuario.save()

    res.render('auth/confirmar-cuenta', {
        pagina: 'Cuenta Confirmada.',
        mensaje: 'La cuenta se confirmo correctamente.',
        error: false
    });
};

const formularioOlvidePassword = (req, res) => {
    res.render('auth/olvide-password', {
        pagina: 'Recupera tu acceso a BienesRaices',
        csrfToken: req.csrfToken()
    });
};

const resetPassword = async (req, res) => {
    //Validacion
    await check('email').isEmail().withMessage('Eso no parece un email').run(req)

    let resultado = validationResult(req)

    if(!resultado.isEmpty()){
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu acceso a BienesRaices',
            errores: resultado.array(),
            csrfToken: req.csrfToken()
        });
    }

    const {email} = req.body

    const usuario = await Usuario.findOne({where: {email}})

    if(!usuario){
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu acceso a BienesRaices',
            errores: [{msg: 'El Email no pertenecea ningun usuario'}],
            csrfToken: req.csrfToken()
        });
    }

    usuario.token = generarId()
    await usuario.save()

    emailOlvidePassword({
        email: usuario.email,
        nombre: usuario.nombre,
        token: usuario.token
    })

    res.render('templates/mensaje', {
        pagina: 'Reestablece tu password',
        mensaje: 'Hemos enviado un Email con las instrucciones.'
    });

};

const comprobarToken = async (req, res) => {
    const {token} = req.params

    const usuario = await Usuario.findOne({where: {token}})

    if(!usuario){
        res.render('auth/confirmar-cuenta', {
            pagina: 'Error al confirmar tu cuenta',
            mensaje: 'Hubo un error al confirmar tu cuenta, intenta de nuevo.',
            error: true
        });
    }

    res.render('auth/reset-password', {
        pagina: 'Reestablece tu password',
        csrfToken: req.csrfToken()
    });
};


const nuevoPassword = async (req, res) => {
    //Validacion
    await check('password').isLength({min: 6}).withMessage('La password contener al menos 6 caracteres').run(req)

    let resultado = validationResult(req)

    if(!resultado.isEmpty()){
        return res.render('auth/reset-password', {
            pagina: 'Reestablece tu password',
            errores: resultado.array(),
            csrfToken: req.csrfToken()
        });
    }

    const {token} = req.params
    const {password} = req.body

    const usuario = await Usuario.findOne({where: {token}})

    const salt = await bcrypt.genSalt(10)
    usuario.password = await bcrypt.hash(password, salt)
    usuario.token = null

    await usuario.save()

    res.render('auth/confirmar-cuenta', {
        pagina: 'Password Reestablecido',
        mensaje: 'El Password se guardo correctamente'
    });
};


export{
    formularioLogin,
    formularioRegistro,
    registrar,
    confirmar,
    formularioOlvidePassword,
    resetPassword,
    comprobarToken,
    nuevoPassword,
    autenticar,
    cerrarSesion
}