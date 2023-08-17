'use server'

import mongoose from "mongoose";
import { connectToDB } from "../mongoose"
import User from "../models/user.model";
import { revalidatePath } from "next/cache";

interface Params {
    userId: string
    username: string
    name: string
    bio: string
    image: string
    path: string
}

export async function updateUser({
    userId,
    username,
    name,
    bio,
    image,
    path
}: Params
): Promise<void> {

    connectToDB();

    try {
        await User.findOneAndUpdate(
            { id: userId },
            {
                username: username.toLowerCase(),
                name,
                bio,
                image,
                onboarded: true
            },
            { upsert: true }
        )

        // if the user is editing their profile, revalide the path upon upserting
        if (path === '/profile/edit') {
            revalidatePath(path)
        }
    } catch (error) {
        throw new Error(`Failed to create/update user: ${error.message}`)
    }
}

export async function fetchUser(userId: String) {

    try {
        connectToDB()

        return await User.findOne({ id: userId })
        // .populate({
        //     path: 'communities',
        //     model: Community
        // })
    } catch (error) {

        throw new Error(`Failed to fetch user: ${error.message}`)
    }
} 