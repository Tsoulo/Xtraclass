import { Router } from "express";
import { eq, and, desc, or, ilike, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  conversations, 
  conversationParticipants, 
  chatMessages, 
  users, 
  students, 
  children,
  insertConversationSchema,
  insertConversationParticipantSchema,
  insertChatMessageSchema
} from "@shared/schema";

const router = Router();

// Get all conversations for current user
router.get("/conversations", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get conversations where user is a participant
    const userConversations = await db
      .select({
        id: conversations.id,
        subject: conversations.subject,
        studentContext: conversations.studentContext,
        studentId: conversations.studentId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .innerJoin(conversationParticipants, eq(conversations.id, conversationParticipants.conversationId))
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    // Get participants and last message for each conversation
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        // Get all participants
        const participants = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
          })
          .from(conversationParticipants)
          .innerJoin(users, eq(conversationParticipants.userId, users.id))
          .where(eq(conversationParticipants.conversationId, conv.id));

        // Get last message
        const lastMessage = await db
          .select({
            id: chatMessages.id,
            content: chatMessages.content,
            sentAt: chatMessages.sentAt,
            senderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
            senderRole: users.role,
          })
          .from(chatMessages)
          .innerJoin(users, eq(chatMessages.senderId, users.id))
          .where(eq(chatMessages.conversationId, conv.id))
          .orderBy(desc(chatMessages.sentAt))
          .limit(1);

        // Count unread messages for current user
        const unreadCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversationId, conv.id),
              sql`NOT (${chatMessages.readBy} @> ${JSON.stringify([userId])})`
            )
          );

        return {
          ...conv,
          participants,
          lastMessage: lastMessage[0] || null,
          unreadCount: Number(unreadCount[0]?.count || 0),
        };
      })
    );

    res.json(conversationsWithDetails);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

// Get messages for a specific conversation
router.get("/conversations/:conversationId/messages", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify user is participant in this conversation
    const isParticipant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, parseInt(conversationId)),
          eq(conversationParticipants.userId, userId)
        )
      );

    if (isParticipant.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get messages for the conversation
    const messages = await db
      .select({
        id: chatMessages.id,
        content: chatMessages.content,
        attachments: chatMessages.attachments,
        sentAt: chatMessages.sentAt,
        senderId: chatMessages.senderId,
        senderName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        senderRole: users.role,
        isRead: chatMessages.isRead,
        readBy: chatMessages.readBy,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(eq(chatMessages.conversationId, parseInt(conversationId)))
      .orderBy(chatMessages.sentAt);

    // Mark messages as read for current user
    await db
      .update(chatMessages)
      .set({
        readBy: sql`COALESCE(${chatMessages.readBy}, '[]'::jsonb) || ${JSON.stringify([userId])}::jsonb`
      })
      .where(
        and(
          eq(chatMessages.conversationId, parseInt(conversationId)),
          sql`NOT (${chatMessages.readBy} @> ${JSON.stringify([userId])})`
        )
      );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/conversations/:conversationId/messages", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    const validatedData = insertChatMessageSchema.parse({
      ...req.body,
      conversationId: parseInt(conversationId),
      senderId: userId,
      readBy: [userId], // Sender has read their own message
    });

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify user is participant in this conversation
    const isParticipant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, parseInt(conversationId)),
          eq(conversationParticipants.userId, userId)
        )
      );

    if (isParticipant.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Insert the message
    const [newMessage] = await db
      .insert(chatMessages)
      .values([validatedData])
      .returning();

    // Update conversation updated_at timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, parseInt(conversationId)));

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// Search students by name, grade, or class
router.get("/search/students", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { q, grade, classId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let query = db
      .select({
        studentId: students.id,
        studentUserId: students.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        gradeLevel: students.gradeLevel,
        schoolName: students.schoolName,
        studentIdNumber: students.studentId,
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id));

    // Add search filters
    const conditions = [];
    
    if (q) {
      conditions.push(
        or(
          ilike(users.firstName, `%${q}%`),
          ilike(users.lastName, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(students.studentId, `%${q}%`)
        )
      );
    }

    if (grade) {
      conditions.push(eq(students.gradeLevel, grade));
    }

    // Apply base condition for students
    let whereConditions = [eq(users.role, "student")];
    
    if (conditions.length > 0) {
      whereConditions = [...whereConditions, ...conditions];
    }
    
    query = query.where(and(...whereConditions));

    const studentsResult = await query.limit(50);

    // Get parents for each student
    const studentsWithParents = await Promise.all(
      studentsResult.map(async (student) => {
        const parents = await db
          .select({
            parentId: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            cellNumber: users.cellNumber,
          })
          .from(children)
          .innerJoin(users, eq(children.parentId, users.id))
          .where(eq(children.studentUserId, student.studentUserId));

        return {
          ...student,
          parents,
        };
      })
    );

    res.json(studentsWithParents);
  } catch (error) {
    console.error("Error searching students:", error);
    res.status(500).json({ message: "Failed to search students" });
  }
});

// Start a new conversation
router.post("/conversations", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const validatedData = insertConversationSchema.parse({
      ...req.body,
      createdBy: userId,
    });

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Create the conversation
    const [newConversation] = await db
      .insert(conversations)
      .values([validatedData])
      .returning();

    // Add participants (creator + recipients)
    const participantIds = [userId, ...(req.body.participantIds || [])];
    const uniqueParticipantIds = Array.from(new Set(participantIds));

    await db.insert(conversationParticipants).values(
      uniqueParticipantIds.map(id => ({
        conversationId: newConversation.id,
        userId: id,
      }))
    );

    // Send initial message if provided
    if (req.body.initialMessage) {
      await db.insert(chatMessages).values([{
        conversationId: newConversation.id,
        senderId: userId,
        content: req.body.initialMessage,
        readBy: [userId],
      }]);
    }

    res.status(201).json(newConversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Failed to create conversation" });
  }
});

export default router;