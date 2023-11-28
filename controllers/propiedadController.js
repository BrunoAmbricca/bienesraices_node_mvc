import { unlink } from 'node:fs/promises'
import { validationResult } from 'express-validator'
import {Precio, Categoria, Propiedad, Mensaje, Usuario} from '../models/index.js'
import {esVendedor, formatearFecha} from '../helpers/index.js'

const admin = async (req, res) => {

    const {pagina: paginaActual} = req.query

    const expresion = /^[0-9]$/

    if(!expresion.test(paginaActual)){
        res.redirect('/mis-propiedades?pagina=1')
    }

    try{
        const { id } = req.usuario

        const limit = 3
        const offset = ((paginaActual * limit) - limit)

        const [propiedades, total] = await Promise.all([
            Propiedad.findAll({
                limit,
                offset,
                where: {
                    usuarioId: id
                },
                include: [ 
                    {model: Categoria, as: 'categoria'},
                    {model: Precio, as: 'precio'},
                    {model: Mensaje, as: 'mensajes'}
                ]
            }),
            Propiedad.count({
                where: {
                    usuarioId: id
                }
            })
        ]) 

        res.render('propiedades/admin', {
            pagina: 'Mis Propiedades',
            csrfToken: req.csrfToken(),
            propiedades,
            paginas: Math.ceil(total / limit),
            paginaActual: Number(paginaActual),
            total,
            offset,
            limit
        })

    } catch(error) {
        console.log(error)
    }

    
}

const crear = async (req, res) => {

    const [categorias, precios] = await Promise.all([
        Categoria.findAll(),
        Precio.findAll() 
    ]);

    res.render('propiedades/crear', {
        pagina: 'Crear Propiedad',
        categorias,
        precios,
        csrfToken: req.csrfToken(),
        datos: {}
    })
}

const guardar = async (req, res) => {

    let resultado = validationResult(req)

    if(!resultado.isEmpty()){
        const [categorias, precios] = await Promise.all([
            Categoria.findAll(),
            Precio.findAll() 
        ]);
    
        res.render('propiedades/crear', {
            pagina: 'Crear Propiedad',
            categorias,
            precios,
            errores: resultado.array(),
            csrfToken: req.csrfToken(),
            datos: req.body
        });
    }

    const {titulo, descripcion, habitaciones, estacionamiento, wc, calle, lat, lng, precio: precioId, categoria: categoriaId} = req.body
    const {id: usuarioId} = req.usuario

    try{
        
        const propiedadGuardada = await Propiedad.create({
            titulo, descripcion,
            habitaciones, 
            estacionamiento, 
            wc, 
            calle, 
            lat, 
            lng, 
            precioId,
            categoriaId,
            usuarioId,
            imagen: ''
        })

        const { id } = propiedadGuardada

        res.redirect(`/propiedades/agregar-imagen/${id}`)

    } catch(error) {
        console.log(error)
    }
    
}

const agregarImagen = async (req, res) => {

    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id)

    if(!propiedad || propiedad.publicado || req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    res.render('propiedades/agregar-imagen', {
        pagina: 'Agregar Imagen',
        csrfToken: req.csrfToken(),
        propiedad
    })
}

const almacenarImagen = async (req, res, next) => {

    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id)

    if(!propiedad || propiedad.publicado || req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    try{
        console.log(req.file)
        propiedad.imagen = req.file.filename
        propiedad.publicado = 1

        await propiedad.save()

        next()

    } catch(error){
        console.log(error)
    }
}

const editar = async (req, res) => {

    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id)

    if(!propiedad || req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    const [categorias, precios] = await Promise.all([
        Categoria.findAll(),
        Precio.findAll() 
    ]);

    res.render('propiedades/editar', {
        pagina: 'Editar Propiedad',
        categorias,
        precios,
        csrfToken: req.csrfToken(),
        datos: propiedad
    })
}

const guardarCambios = async (req, res) => {
    let resultado = validationResult(req)

    if(!resultado.isEmpty()){
        const [categorias, precios] = await Promise.all([
            Categoria.findAll(),
            Precio.findAll() 
        ]);
    
        res.render('propiedades/editar', {
            pagina: 'Editar Propiedad',
            categorias,
            precios,
            csrfToken: req.csrfToken(),
            datos: req.body,
            errores: resultado.array()
        })
    }

    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id)

    if(!propiedad || req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    try{
        
        const {titulo, descripcion, habitaciones, estacionamiento, wc, calle, lat, lng, precio: precioId, categoria: categoriaId} = req.body

        propiedad.set({
            titulo, descripcion,
            habitaciones, 
            estacionamiento, 
            wc, 
            calle, 
            lat, 
            lng, 
            precioId,
            categoriaId
        })

        await propiedad.save()

        res.redirect(`/mis-propiedades`)

    } catch(error) {
        console.log(error)
    }
}

const eliminar = async (req, res) => {

    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id)

    if(!propiedad || req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    await unlink(`public/uploads/${propiedad.imagen}`)

    propiedad.destroy()

    res.redirect('/mis-propiedades')
}

const cambiarEstado = async (req, res) => {
    
    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id)

    if(!propiedad || req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    propiedad.publicado = !propiedad.publicado

    await propiedad.save()

    res.json({
        resultado: 'ok'
    })
}

const mostrarPropiedad = async (req, res) => {
    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id, {
        include: [
            {model: Categoria, as: 'categoria'},
            {model: Precio, as: 'precio'}
        ]
    })

    if(!propiedad || !propiedad.publicado){
        return res.redirect('/404')
    }

    res.render('propiedades/mostrar', {
        propiedad,
        pagina: propiedad.titulo,
        csrfToken: req.csrfToken(),
        usuario: req.usuario,
        esVendedor: esVendedor(req.usuario?.id, propiedad.usuarioId)      
    })
    
}

const enviarMensaje = async (req, res) => {

    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id, {
        include: [
            {model: Categoria, as: 'categoria'},
            {model: Precio, as: 'precio'}
        ]
    })

    if(!propiedad){
        return res.redirect('/404')
    }

    let resultado = validationResult(req)

    if(!resultado.isEmpty()){ 
    
        return res.render('propiedades/mostrar', {
            propiedad,
            pagina: propiedad.titulo,
            csrfToken: req.csrfToken(),
            usuario: req.usuario,
            esVendedor: esVendedor(req.usuario?.id, propiedad.usuarioId),
            errores: resultado.array()      
        })
    }

    const {mensaje} = req.body
    const {id: propiedadId} = req.params
    const {id: usuarioId} = req.usuario

    await Mensaje.create({
        mensaje,
        propiedadId,
        usuarioId
    })  

    res.redirect('/')
    
}

const verMensajes = async (req, res) => {

    const {id} = req.params

    const propiedad = await Propiedad.findByPk(id, {
        include: [  
            {model: Mensaje, as: 'mensajes', 
                include: [  
                    {model: Usuario.scope('eliminarPassword'), as: 'usuario'}
                ]
            }
        ]
    })

    if(!propiedad || req.usuario.id.toString() !== propiedad.usuarioId.toString()){
        return res.redirect('/mis-propiedades')
    }

    res.render('propiedades/mensajes', {
        pagina: 'Mensajes',
        mensajes: propiedad.mensajes,
        formatearFecha
    })
}

export{
    admin,
    crear,
    guardar,
    agregarImagen,
    almacenarImagen,
    editar,
    guardarCambios,
    eliminar,
    mostrarPropiedad,
    enviarMensaje,
    verMensajes,
    cambiarEstado
}