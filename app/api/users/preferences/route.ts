import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/mysql/client"; // MySQL client
import { verifyJwtToken } from "@/lib/auth/jwt";
import { v4 as uuidv4 } from "uuid";

// Update user preferences
export async function PUT(request: NextRequest) {
  let connection;
  try {
    let token = request.cookies.get("accessToken")?.value;
    const authHeader = request.headers.get('authorization');

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    
    if (!token) {
      return NextResponse.json({ error: "Não autorizado: token não fornecido" }, { status: 401 });
    }
    
    const payload = await verifyJwtToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    
    const userId = payload.userId;
    const body = await request.json();
    // Schema fields: email_notifications, sms_notifications, theme
    const { emailNotifications, smsNotifications, theme } = body;

    connection = await getDbConnection();

    // Check if preferences exist for the user
    const [existingPreferences]: any = await connection.execute(
      "SELECT id FROM user_preferences WHERE user_id = ?",
      [userId]
    );

    const updateData: { [key: string]: any } = {};
    if (emailNotifications !== undefined) updateData.email_notifications = Boolean(emailNotifications);
    if (smsNotifications !== undefined) updateData.sms_notifications = Boolean(smsNotifications);
    if (theme !== undefined) updateData.theme = theme;

    if (existingPreferences.length > 0) {
      // Update existing preferences
      if (Object.keys(updateData).length > 0) {
        // updateData.updated_at = new Date(); // Use NOW() in SQL for updated_at
        const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateData);
        values.push(userId); // For WHERE user_id = ?
        await connection.execute(`UPDATE user_preferences SET ${fields}, updated_at = NOW() WHERE user_id = ?`, values);
      }
    } else {
      // Create new preferences
      const newPrefsId = uuidv4();
      // Ensure all fields from schema are present or have defaults
      const insertData: { [key: string]: any } = {
        id: newPrefsId,
        user_id: userId,
        email_notifications: updateData.email_notifications !== undefined ? updateData.email_notifications : true, // Default
        sms_notifications: updateData.sms_notifications !== undefined ? updateData.sms_notifications : false, // Default
        theme: updateData.theme || "light", // Default
        // created_at and updated_at handled by DB default (NOW())
      };
      const insertFields = Object.keys(insertData);
      const insertPlaceholders = insertFields.map(() => '?').join(', ');
      const insertValues = Object.values(insertData);
      await connection.execute(
        `INSERT INTO user_preferences (${insertFields.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders}, NOW(), NOW())`,
        insertValues
      );
    }
    
    return NextResponse.json({ message: "Preferências atualizadas com sucesso" });

  } catch (error: any) {
    console.error("Error updating user preferences (MySQL):", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
