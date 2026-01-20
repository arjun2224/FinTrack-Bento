"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export async function createUser(prevState: any, formData: FormData) {
    const session = await auth();
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return { error: "Unauthorized" };
    }

    const validatedFields = UserSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role") || "USER",
    });

    if (!validatedFields.success) {
        return { error: "Invalid input" };
    }

    const { email, password, role } = validatedFields.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
            },
        });
        revalidatePath("/settings");
        return { success: "User created successfully" };
    } catch (error) {
        return { error: "Failed to create user. Email might already exist." };
    }
}

export async function deleteUser(userId: string) {
    const session = await auth();
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        throw new Error("Unauthorized");
    }

    // Prevent deleting self?
    if (session.user?.email === userId) {
        // userId here is ID not email ideally, but let's check.
        // pass ID.
    }

    // Check if deleting self
    // We need to know current user ID. 
    // Wait, session.user has email.

    try {
        const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
        if (userToDelete?.email === session.user?.email) {
            throw new Error("Cannot delete your own admin account.");
        }

        await prisma.user.delete({ where: { id: userId } });
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        return { error: "Failed to delete user" };
    }
}

export async function resetPassword(userId: string, formData: FormData) {
    const session = await auth();
    // @ts-ignore
    if (!session || session.user?.role !== "ADMIN") {
        return { error: "Unauthorized" };
    }

    const password = formData.get("password");
    if (!password || typeof password !== "string" || password.length < 6) {
        return { error: "Password must be at least 6 characters" };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        revalidatePath("/settings");
        return { success: "Password reset successfully" };
    } catch (error) {
        return { error: "Failed to reset password" };
    }
}
