import { auth } from "@/auth";
import SettingsClient from "./client";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const session = await auth();
    if (!session) {
        redirect("/login");
    }

    let users: any[] = [];
    // @ts-ignore
    if (session.user?.role === "ADMIN") {
        users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            }
        });
    }

    return <SettingsClient session={session} users={users} />;
}
