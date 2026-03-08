import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";

interface AuthStatus {
  required: boolean;
  authenticated?: boolean;
}

export function useAuthStatus() {
  return useQuery({
    queryKey: queryKeys.auth.status,
    queryFn: async () => {
      const { data } = await api.get<AuthStatus>("/api/auth/status");
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useVerifyPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => {
      await api.post("/api/auth/verify", { pin });
    },
    onSuccess: () => {
      qc.setQueryData(queryKeys.auth.status, {
        required: true,
        authenticated: true,
      });
    },
  });
}
