import {exit} from 'node:process'
import categorias from './categorias.js'
import db from '../config/db.js'
import precios from './precios.js'
import usuarios from './usuarios.js'
import {Categoria, Precio, Usuario} from '../models/index.js'

const importDatos = async () => {
    try {
        await db.authenticate()

        await db.sync()

        await Promise.all([
            await Categoria.bulkCreate(categorias),
            await Precio.bulkCreate(precios),
            await Usuario.bulkCreate(usuarios)
        ])

        console.log('Datos IMPORTADOS correctamente')
        exit()

    } catch(error) {
        console.log(error)
        exit(1)
    }
}

const eliminarDatos = async () => {
    try {
        await Promise.all([
            await Categoria.destroy({where: {}/*, truncate: true*/}),
            await Precio.destroy({where: {}/*, truncate: true*/}),
            await Usuario.destroy({where: {}/*, truncate: true*/})
        ])

        console.log('Datos ELIMINADOS correctamente')
        exit()

    } catch(error) {
        console.log(error)
        exit(1)
    }
}

if(process.argv[2] === '-i'){
    importDatos();
}

if(process.argv[2] === '-e'){
    eliminarDatos();
}