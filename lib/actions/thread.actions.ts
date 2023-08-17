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


export async function fetchPosts(pageNumber = 1, pageSize = 20) {

    connectToDB()

    //calculate number of posts to skip
    const skipAmount = (pageNumber - 1) * pageSize

    // Fetchs posts that have no parents (i.e. top level threads )
    const postsQuery = Thread.find({
        parentId: { $in: [null, undefined] }
    })
        .sort({ createdAt: 'desc' })
        .skip(skipAmount)
        .limit(pageSize)
        .populate({ path: 'author', model: User })
        .populate({
            path: 'children',
            populate: {
                path: 'author',
                model: User,
                select: '_id name parentId image'
            }
        })

    const totalPostsCount = await Thread.countDocuments({
        parentId: {
            $in: [null, undefined]
        }
    })

    const posts = await postsQuery.exec()
    const inNext = totalPostsCount > skipAmount + posts.length

    return { posts, inNext }

}


export async function fetchThreadById(id: string) {

    connectToDB()

    try {

        // TODO: populate community 

        // this query is fetching the parent post, its children, and the grand childrens (childrens of children)
        const thread = await Thread.findById(id)
            .populate({
                path: 'author',
                model: User,
                select: '_id id name image'
            })
            .populate({
                path: 'children',
                populate: [{
                    path: 'author',
                    model: User,
                    select: '_id id name parentId imag`e'
                },
                {
                    path: 'children',
                    model: Thread,
                    populate: {
                        path: 'author',
                        model: User,
                        select: "_id id name parentId image"
                    }
                }
                ]
            }).exec();
        return thread
    } catch (error) {

    }

}