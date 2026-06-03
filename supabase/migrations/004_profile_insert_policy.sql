-- 允許使用者建立自己的 profile（觸發器未執行時的後備）
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users_profile;
CREATE POLICY "Users can insert own profile"
  ON public.users_profile FOR INSERT
  WITH CHECK (auth.uid() = id);
