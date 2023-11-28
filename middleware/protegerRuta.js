import jwt from "jsonwebtoken";
import { Usuario } from "../models/index.js";

const protegerRuta = async (req, res, next) => {
    const { _token } = req.cookies

    if(!_token){
        return res.redirect('/auth/login')
    }

    try{
        const decoded = jwt.verify(_token, process.env.JWT_SECRET)
        const usuario = await Usuario.scope('eliminarPassword').findByPk(decoded.id)
        
        if(usuario){
            req.usuario = usuario
        }
        else{
            return res.redirect('/auth/login')
        }

    } catch(error){
        return res.clearCookie('_token').redirect('/auth/login')
    }

    next();
}

export default protegerRuta;