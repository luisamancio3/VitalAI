import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { db } from "../config/database.js";
import { users, weeklyReports } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { generateWeeklyReport, generateReportsForAllUsers } from "../services/report-generator.js";

export default async function reportsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  // GET /weekly — list weekly reports (newest first)
  app.get("/weekly", async (request, reply) => {
    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const reports = await db
      .select({
        id: weeklyReports.id,
        weekStart: weeklyReports.weekStart,
        weekEnd: weeklyReports.weekEnd,
        createdAt: weeklyReports.createdAt,
      })
      .from(weeklyReports)
      .where(eq(weeklyReports.userId, user.id))
      .orderBy(desc(weeklyReports.weekStart))
      .limit(20);

    return reply.status(200).send(reports);
  });

  // GET /weekly/:id — get specific report with full data
  app.get("/weekly/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    const [report] = await db
      .select()
      .from(weeklyReports)
      .where(eq(weeklyReports.id, id))
      .limit(1);

    if (!report || report.userId !== user.id) {
      return reply.status(404).send({ error: "Report not found" });
    }

    return reply.status(200).send(report);
  });

  // POST /weekly/generate — manually trigger report generation (for testing)
  app.post("/weekly/generate", async (request, reply) => {
    const auth0Id = request.userId;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.auth0Id, auth0Id)).limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });

    try {
      const reportText = await generateWeeklyReport(user.id);
      return reply.status(201).send({ success: true, reportText });
    } catch (error) {
      request.log.error(error, "Failed to generate weekly report");
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
