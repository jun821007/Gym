/** 將 Supabase Auth 英文錯誤轉成可操作的繁中說明 */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return (
      "Email 或密碼不正確。請確認：\n" +
      "1) 是否用註冊時同一組密碼\n" +
      "2) Supabase 若開啟「Email 確認」，需先點信裡連結\n" +
      "3) 可試「忘記密碼」重設"
    );
  }
  if (m.includes("email not confirmed")) {
    return "請先到信箱點確認連結；或到 Supabase → Authentication → Email 關閉 Confirm email。";
  }
  if (m.includes("user already registered")) {
    return "此 Email 已註冊，請改按「登入」。";
  }
  if (m.includes("password") && m.includes("least")) {
    return "密碼至少 6 碼。";
  }
  if (m.includes("signup") && m.includes("disabled")) {
    return "目前不開放註冊，請聯絡管理員。";
  }

  return message;
}
