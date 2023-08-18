'use server'

import mongoose, { FilterQuery, SortOrder } from "mongoose";
import { connectToDB } from "../mongoose"
import User from "../models/user.model";
import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";

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

export async function fetchUserPosts(userId: string) {

    try {

        connectToDB()

        //TODO populate community

        // find all threads of the userId
        const threads = await User.findOne({ id: userId })
            .populate({
                path: 'threads',
                model: Thread,
                populate: {
                    path: 'children',
                    model: Thread,
                    populate: {
                        path: 'author',
                        model: User,
                        select: 'name image id'
                    }
                }
            })
        return threads;
    } catch (error: any) {
        throw new Error(`Failed to fetch user post: ${error.message}`)
    }
}

export async function fetchUsers({
    userId,
    searchString,
    pageNumber = 1,
    pageSize = 20,
    sortBy = 'desc'
}:
    {
        userId: string,
        searchString: string,
        pageNumber?: number,
        pageSize?: number,
        sortBy?: SortOrder
    }
) {

    try {
        connectToDB()

        const skipAmount = (pageNumber - 1) * pageSize

        const regex = new RegExp(searchString, 'i')

        const query: FilterQuery<typeof User> = {
            id: { $ne: userId }
        }

        if (searchString.trim() !== '') {
            query.$or = [
                { username: { $regex: regex } },
                { name: { $regex: regex } }
            ]
        }

        const sortOptions = { createdAt: sortBy }
        const userQuery = User.find(query).sort(sortOptions).skip(skipAmount).limit(pageSize)

        const totalUsersCount = await User.countDocuments(query)

        const users = await userQuery.exec()

        const isNext = totalUsersCount > skipAmount + users.length

        return { users, isNext }

    } catch (error) {
        throw new Error(`Failed to fetch users: ${error.message}`)
    }
}

// TLDR; gets all comments from other users
export async function getActivity(userId: string) {
    try {
        connectToDB()

        // get all thread by the user
        const userThreads = await Thread.find({ author: userId })

        // get all child thread ids (replies) from children field
        const childThreadIds = userThreads.reduce((acc, userThreads) => {
            return acc.concat(userThreads.children)
        }, [])

        // get all replies excluding the ones made by the user
        const replies = await Thread.find({
            _id: { $in: childThreadIds },
            author: { $ne: userId }
        }).populate({
            path: 'author',
            model: User,
            select: 'name image _id'
        })

        return replies

    } catch (error) {
        throw new Error(`Failed to fetch activity: ${error.message}`)
    }
}