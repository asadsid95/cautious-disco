'use server'

import { revalidatePath } from "next/cache"
import Thread from "../models/thread.model"
import User from "../models/user.model"
import { connectToDB } from "../mongoose"

interface Params {
    text: string,
    author: string,
    path: string,
    communityId: string | null
}

export async function createThread({ text, author, path, communityId }: Params) {


    try {
        connectToDB()

        // insert thread
        const createdThread = await Thread.create({
            text,
            author,
            community: null
        })

        // don't forget to update user model by sending the id of the recently-added thread
        await User.findByIdAndUpdate(author, {
            $push: { threads: createdThread._id }
        })

        // to ensure changes happen immediately
        revalidatePath(path)
    } catch (error: any) {
        throw new Error(`Error creating thread: ${error.message}`)
    }

}
