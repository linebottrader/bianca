import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const EMPTY_ROLES = {
  isAdmin: false,
  isManager: false,
  isKds: false,
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isKds, setIsKds] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  const syncIdRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);

  const applyRoles = useCallback((roles: typeof EMPTY_ROLES) => {
    if (!mountedRef.current) return;
    setIsAdmin(roles.isAdmin);
    setIsManager(roles.isManager);
    setIsKds(roles.isKds);
  }, []);

  const resetRoles = useCallback(() => {
    applyRoles(EMPTY_ROLES);
  }, [applyRoles]);

  const resolveRoles = useCallback(async (nextUser: User, syncId: number, preserveExistingRoles: boolean) => {
    try {
      const [adminRes, managerRes, kdsRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: nextUser.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: nextUser.id, _role: "manager" }),
        supabase.rpc("has_role", { _user_id: nextUser.id, _role: "kds" }),
      ]);

      if (!mountedRef.current || syncIdRef.current !== syncId) return;

      applyRoles({
        isAdmin: !!adminRes.data,
        isManager: !!managerRes.data,
        isKds: !!kdsRes.data,
      });
    } catch (err) {
      console.error("[useAuth] has_role error:", err);

      if (!mountedRef.current || syncIdRef.current !== syncId) return;

      if (!preserveExistingRoles) {
        resetRoles();
      }
    } finally {
      if (mountedRef.current && syncIdRef.current === syncId) {
        setLoading(false);
      }
    }
  }, [applyRoles, resetRoles]);

  const syncSessionState = useCallback((session: Session | null) => {
    const syncId = ++syncIdRef.current;
    const nextUser = session?.user ?? null;

    if (!mountedRef.current) return;

    setUser(nextUser);

    if (!nextUser) {
      lastUserIdRef.current = null;
      resetRoles();
      setLoading(false);
      return;
    }

    const sameUser = lastUserIdRef.current === nextUser.id;
    lastUserIdRef.current = nextUser.id;

    if (!sameUser) {
      setLoading(true);
    }

    void resolveRoles(nextUser, syncId, sameUser);
  }, [resetRoles, resolveRoles]);

  useEffect(() => {
    mountedRef.current = true;

    // Safety timeout — never stay loading forever
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) {
        console.warn("[useAuth] safety timeout reached while restoring auth state");
        setLoading(false);
      }
    }, 7000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        window.setTimeout(() => {
          if (!mountedRef.current) return;
          syncSessionState(session);
        }, 0);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mountedRef.current) return;
        syncSessionState(session);
      })
      .catch((err) => {
        console.error("[useAuth] getSession error:", err);
        if (!mountedRef.current) return;
        lastUserIdRef.current = null;
        setUser(null);
        resetRoles();
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [resetRoles, syncSessionState]);

  return { user, isAdmin, isManager, isKds, loading };
}
