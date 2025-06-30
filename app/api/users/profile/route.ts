import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "@/lib/mysql/client"; // MySQL client
import { verifyJwtToken } from "@/lib/auth/jwt";
import { v4 as uuidv4 } from "uuid";

// Helper to format the combined profile response
function formatProfileResponse(user: any, profile: any, preferences: any) {
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "",
    avatarUrl: user.avatar_url || "", // Mapped from snake_case
    bio: profile?.bio || "",
    phone: profile?.phone || "",
    position: profile?.address || "", // Using address as position
    preferences: {
      emailNotifications: preferences?.email_notifications !== undefined ? Boolean(preferences.email_notifications) : true, // Default true
      smsNotifications: preferences?.sms_notifications !== undefined ? Boolean(preferences.sms_notifications) : false, // Default false
      theme: preferences?.theme || "light", // Default light
    },
    createdAt: user.created_at,
    updatedAt: user.updated_at, // Assuming users table has this, or combine from profile/prefs
  };
}

// GET - Obter perfil do usuário autenticado
export async function GET(request: NextRequest) {
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

    connection = await getDbConnection();
    const [userRows]: any = await connection.execute(
      "SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users WHERE id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    const user = userRows[0];

    const [profileRows]: any = await connection.execute(
      "SELECT bio, phone, address FROM user_profiles WHERE user_id = ?",
      [userId]
    );
    const profile = profileRows.length > 0 ? profileRows[0] : null;

    const [prefRows]: any = await connection.execute(
      "SELECT email_notifications, sms_notifications, theme FROM user_preferences WHERE user_id = ?",
      [userId]
    );
    const preferences = prefRows.length > 0 ? prefRows[0] : null;

    return NextResponse.json(formatProfileResponse(user, profile, preferences));

  } catch (error: any) {
    console.error("Erro ao buscar perfil (MySQL):", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}

// PUT - Atualizar perfil do usuário
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

    connection = await getDbConnection();
    await connection.beginTransaction();

    // Update users table
    const userUpdates: { [key: string]: any } = {};
    if (body.name !== undefined) userUpdates.name = body.name;
    if (body.avatarUrl !== undefined) userUpdates.avatar_url = body.avatarUrl; // Map from camelCase
    // Email change might require verification, handle with care or separate endpoint
    // Role change should be admin restricted (already handled in [id]/route.ts, consider if needed here)

    if (Object.keys(userUpdates).length > 0) {
      const userFields = Object.keys(userUpdates).map(key => `${key} = ?`).join(', ');
      const userValues = Object.values(userUpdates);
      userValues.push(userId);
      await connection.execute(`UPDATE users SET ${userFields}, updated_at = NOW() WHERE id = ?`, userValues);
    }

    // Update/Insert user_profiles table
    const profileUpdates: { [key: string]: any } = {};
    if (body.bio !== undefined) profileUpdates.bio = body.bio;
    if (body.phone !== undefined) profileUpdates.phone = body.phone;
    if (body.position !== undefined) profileUpdates.address = body.position; // Using address for position

    if (Object.keys(profileUpdates).length > 0) {
      const [existingProfile]: any = await connection.execute("SELECT id FROM user_profiles WHERE user_id = ?", [userId]);
      if (existingProfile.length > 0) {
        const profileFields = Object.keys(profileUpdates).map(key => `${key} = ?`).join(', ');
        const profileValues = Object.values(profileUpdates);
        profileValues.push(userId);
        await connection.execute(`UPDATE user_profiles SET ${profileFields}, updated_at = NOW() WHERE user_id = ?`, profileValues);
      } else {
        const newProfileId = uuidv4();
        profileUpdates.id = newProfileId;
        profileUpdates.user_id = userId;
        const profileFields = Object.keys(profileUpdates);
        const profilePlaceholders = profileFields.map(() => '?').join(', ');
        const profileValues = Object.values(profileUpdates);
        await connection.execute(`INSERT INTO user_profiles (${profileFields.join(', ')}, created_at, updated_at) VALUES (${profilePlaceholders}, NOW(), NOW())`, profileValues);
      }
    }
    
    // Update/Insert user_preferences table
    if (body.preferences) {
      const prefUpdates: { [key: string]: any } = {};
      if (body.preferences.emailNotifications !== undefined) prefUpdates.email_notifications = Boolean(body.preferences.emailNotifications);
      if (body.preferences.smsNotifications !== undefined) prefUpdates.sms_notifications = Boolean(body.preferences.smsNotifications);
      if (body.preferences.theme !== undefined) prefUpdates.theme = body.preferences.theme;

      if (Object.keys(prefUpdates).length > 0) {
        const [existingPrefs]: any = await connection.execute("SELECT id FROM user_preferences WHERE user_id = ?", [userId]);
        if (existingPrefs.length > 0) {
          const prefFields = Object.keys(prefUpdates).map(key => `${key} = ?`).join(', ');
          const prefValues = Object.values(prefUpdates);
          prefValues.push(userId);
          await connection.execute(`UPDATE user_preferences SET ${prefFields}, updated_at = NOW() WHERE user_id = ?`, prefValues);
        } else {
          const newPrefsId = uuidv4();
          prefUpdates.id = newPrefsId;
          prefUpdates.user_id = userId;
           // Set defaults if not provided in body.preferences
          if (prefUpdates.email_notifications === undefined) prefUpdates.email_notifications = true;
          if (prefUpdates.sms_notifications === undefined) prefUpdates.sms_notifications = false;
          if (prefUpdates.theme === undefined) prefUpdates.theme = "light";

          const prefFields = Object.keys(prefUpdates);
          const prefPlaceholders = prefFields.map(() => '?').join(', ');
          const prefValues = Object.values(prefUpdates);
          await connection.execute(`INSERT INTO user_preferences (${prefFields.join(', ')}, created_at, updated_at) VALUES (${prefPlaceholders}, NOW(), NOW())`, prefValues);
        }
      }
    }

    await connection.commit();
    return NextResponse.json({ message: "Perfil atualizado com sucesso" });

  } catch (error: any) {
    console.error("Erro ao atualizar perfil (MySQL):", error);
    if (connection) await connection.rollback();
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  } finally {
    if (connection) await connection.release();
  }
}
