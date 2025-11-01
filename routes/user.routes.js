import express from "express";
import jwt from 'jsonwebtoken'
import db from "../db/index.js"
import { userTable } from "../models/user.model.js";
import { eq } from "drizzle-orm";
import { hashPasswordWithSalt } from "../utils/hash.js";
import { loginPostRequestBodySchema, signupPostRequestBodySchema } from "../validation/request.validation.js";
import { createNewUser, getUserByEmail } from "../services/user.service.js";
import { createUserToken } from "../utils/token.js";

const router = express.Router();

//signup route

router.post('/signup', async (req, res) => {

    const validationResult = await signupPostRequestBodySchema.safeParseAsync(
        req.body
    );

    if(validationResult.error){
        return res.status(400).json({error: validationResult.error.message})
    }
    const {firstname, lastname, email, password} = validationResult.data;

    const existingUser = await getUserByEmail(email);

    if(existingUser){
        return res.status(400).json({error: `user with this email ${email} already exist`})
    }

    const {hashedPassword, salt} = hashPasswordWithSalt(password);

    const userData = {
       firstname,
        lastname,
        email,
        salt,
        password: hashedPassword
    }
    const user = await createNewUser(userData);

    return res.status(201).json({data: {userId: user.id}});
})


//login route

router.post('/login',async (req, res) => {
    const validationResult = await loginPostRequestBodySchema.safeParseAsync(
        req.body
    )

    if(validationResult.error){
       return res.status(400).json({error: validationResult.error.message})
    }

    const {email, password} = validationResult.data;

    const user = await getUserByEmail(email);

    if(!user){
        return res.status(400).json({error: `user with email ${email} doesn't exists`});
    }

    const {salt, hashedPassword} = hashPasswordWithSalt(password, user.salt);

    if(hashedPassword!==user.password){
        return res.status(400).json({error: 'the password is invalid'})
    }

    const token = await createUserToken({id: user.id});
    
    return res.json({ token, user: {
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email
    } })

})

export default router;