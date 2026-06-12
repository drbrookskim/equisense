import { supabase } from './supabase'

export async function login(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function logout() {
  await supabase.auth.signOut()
}

export async function getIdToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return data.session !== null
}
